// Trace public declarations, documentation and commits to the exact endpoints used by the report.
import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import ts from 'typescript';

export const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 48 * 1024 * 1024 }).trimEnd();
export const base = '5.0.0';
export const repo = 'https://github.com/vexflow/vexflow';

/** Enumerate exports from the public entry point; skip private class implementation and JSDoc. */
function declarations(root) {
  const entry = join(root, 'entry/vexflow.d.ts');
  const program = ts.createProgram([entry], { skipLibCheck: true, moduleResolution: ts.ModuleResolutionKind.Node10 });
  const checker = program.getTypeChecker(),
    source = program.getSourceFile(entry);
  const printer = ts.createPrinter({ removeComments: true });
  const print = (n) => printer.printNode(ts.EmitHint.Unspecified, n, n.getSourceFile()).replace(/\s+/g, ' ').trim();
  const api = new Map();
  for (const sym of checker.getExportsOfModule(checker.getSymbolAtLocation(source))) {
    const actual = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
    const name = sym.name;
    for (const d of actual.declarations ?? []) {
      const put = (key, signature) => api.set(key, [...(api.get(key) ?? []), signature]);
      if (ts.isClassDeclaration(d) || ts.isInterfaceDeclaration(d)) {
        put(
          name,
          [
            ts.isClassDeclaration(d) ? 'class' : 'interface',
            name,
            ...(d.typeParameters ?? []).map(print),
            ...(d.heritageClauses ?? []).map(print),
          ].join(' ')
        );
        for (const m of d.members) {
          if (
            m.modifiers?.some((t) => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(t.kind)) ||
            ts.isPrivateIdentifier(m.name ?? m)
          )
            continue;
          const member = m.name?.getText() ?? (ts.isConstructorDeclaration(m) ? 'constructor' : '[signature]');
          const side = m.modifiers?.some((t) => t.kind === ts.SyntaxKind.StaticKeyword) ? 'static ' : '';
          put(name + '.' + side + member, print(m));
        }
      } else put(name, print(d));
    }
  }
  return api;
}

/** Diff actual shipped declarations with a fresh declaration build. Preserve overloads and exact types. */
export async function apiChanges(work) {
  const old = join(work, 'types-5.0.0');
  await mkdir(old, { recursive: true });
  const packed = join(old, 'declarations.tar');
  await writeFile(packed, execFileSync('git', ['archive', base, 'build/types'], { maxBuffer: 32e6 }));
  execFileSync('tar', ['-xf', packed, '-C', old]);
  await rm(packed);
  const before = declarations(join(old, 'build/types')),
    after = declarations('build/types');
  if (before.size < 500 || after.size < before.size / 2) throw Error('Incomplete declaration exports');
  return [...new Set([...before.keys(), ...after.keys()])].sort().flatMap((name) => {
    const a = before.get(name)?.join('\n'),
      b = after.get(name)?.join('\n');
    return a === b ? [] : [{ name, before: a, after: b, change: a ? (b ? 'Changed' : 'Removed') : 'Added' }];
  });
}

/** Retain a short, selectable first-parent diff. Binary changes already list their paths. */
function diffExcerpt(hash, paths) {
  const files = paths.filter(
    (path) =>
      /\.(ts|js|mjs|md|ya?ml|css|html|json)$/.test(path) &&
      !/^(build\/|src\/fonts\/)|package-lock\.json$|\.min\.js$/.test(path)
  );
  const path = files.find((file) => file.startsWith('src/')) ?? files[0];
  if (!path) return;
  const lines = git('diff', '--no-ext-diff', '--no-textconv', '--unified=2', hash + '^1', hash, '--', path).split('\n');
  const start = lines.findIndex((line) => line.startsWith('@@'));
  if (start >= 0)
    return {
      path,
      text: lines
        .slice(start, start + 16)
        .map((line) => (line.length > 160 ? line.slice(0, 157) + '…' : line))
        .join('\n'),
    };
}

/** Include merge and maintenance commits so each overview can be checked against the complete range. */
export function collectHistory(head) {
  const range = base + '..' + head;
  const commits = git('log', '--topo-order', '--format=%H%x1f%as%x1f%s%x1f%P%x1f%b%x1e', range)
    .split('\x1e')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [hash, date, subject, parents, body = ''] = s.split('\x1f');
      const paths = git('diff-tree', '--no-commit-id', '-r', '--name-only', parents.split(' ')[0], hash)
        .split('\n')
        .filter(Boolean);
      return { hash, date, subject, body, merge: parents.includes(' '), paths, excerpt: diffExcerpt(hash, paths) };
    });
  const docs = git('diff', '--name-status', '-M', base, head, '--', '*.md', 'docs', 'guide', 'tools/explorer')
    .split('\n')
    .map((row) => row.split('\t'))
    .filter((row) => row.at(-1)?.endsWith('.md'))
    .map(([status, path, newPath]) => ({ status, path, newPath }));
  const releases = git('tag', '--merged', head, '--list', '5.*', '--sort=version:refname')
    .split('\n')
    .filter((tag) => /^5\.\d+\.\d+$/.test(tag))
    .map((tag) => ({
      tag,
      hash: git('rev-parse', tag + '^{commit}'),
      date: git('show', '-s', '--format=%as', tag + '^{commit}'),
    }));
  return { commits, docs, releases };
}
