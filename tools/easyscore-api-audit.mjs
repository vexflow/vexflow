// Snapshot public native option families so EasyScore coverage reviews notice API drift.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import ts from 'typescript';

const root = new URL('../', import.meta.url);
const snapshot = new URL('docs/easyscore-native-api.json', root);
const text = (node) => node?.getText().replace(/\s+/g, ' ').trim();
const has = (node, kind) => node.modifiers?.some((modifier) => modifier.kind === kind);

/** Record source declarations, including inline options and inherited interface names. */
export function nativeSurface() {
  const index = readFileSync(new URL('src/index.ts', root), 'utf8');
  const modules = [...index.matchAll(/^export \* from '\.\/([^']+)';/gm)].map((match) => match[1]);
  // The make facade's public methods live outside index.ts but are part of EasyScore's surface.
  modules.push('easyscore/elements', 'easyscore/composition', 'easyscore/rhythm');
  return Object.fromEntries(
    modules.map((module) => {
      const path = new URL(`src/${module}.ts`, root);
      const file = ts.createSourceFile(fileURLToPath(path), readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
      const declarations = {};
      for (const node of file.statements) {
        if (!has(node, ts.SyntaxKind.ExportKeyword)) continue;
        const name = text(node.name);
        if (ts.isInterfaceDeclaration(node)) {
          declarations[name] = { extends: node.heritageClauses?.map(text) ?? [], fields: node.members.map(text) };
        } else if (ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) {
          declarations[name] = text(node);
        } else if (ts.isClassDeclaration(node)) {
          declarations[name] = node.members
            .filter(
              (member) => !has(member, ts.SyntaxKind.PrivateKeyword) && !has(member, ts.SyntaxKind.ProtectedKeyword)
            )
            .map((member) => {
              const name = text(member.name) ?? 'constructor';
              if (member.parameters)
                return `${name}(${member.parameters.map(text).join(', ')})${member.type ? ': ' + text(member.type) : ''}`;
              return `${name}${member.type ? ': ' + text(member.type) : ''}`;
            });
        } else if (ts.isFunctionDeclaration(node)) {
          declarations[name] = `(${node.parameters.map(text).join(', ')})${node.type ? ': ' + text(node.type) : ''}`;
        } else if (ts.isVariableStatement(node)) {
          for (const declaration of node.declarationList.declarations)
            declarations[text(declaration.name)] = text(declaration.type) ?? 'inferred';
        }
      }
      return [module, declarations];
    })
  );
}

/** Updating the snapshot requires reviewing the EasyScore coverage manifest and guide together. */
export function checkNativeSurface() {
  assert.deepEqual(
    nativeSurface(),
    JSON.parse(readFileSync(snapshot, 'utf8')),
    'Native API changed. Review EasyScore coverage, then run node tools/easyscore-api-audit.mjs --update.'
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--update')) writeFileSync(snapshot, JSON.stringify(nativeSurface(), null, 2) + '\n');
  else checkNativeSurface();
}
