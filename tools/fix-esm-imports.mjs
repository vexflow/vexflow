// Add explicit extensions to relative ESM imports emitted by TypeScript.
// Package names and URLs are left intact. Run: node tools/fix-esm-imports.mjs build/esm
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

/** Visit every file below the compiled output directory. */
function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(name);
    else yield name;
  }
}

/** Resolve relative file names without changing packages, URLs, or explicit extensions. */
function fixSpecifier(specifier) {
  if (!/^(\.\.?\/|\.\.?$)/.test(specifier)) return specifier;
  const suffixIndex = specifier.search(/[?#]/);
  const name = suffixIndex < 0 ? specifier : specifier.slice(0, suffixIndex);
  const suffix = suffixIndex < 0 ? '' : specifier.slice(suffixIndex);
  if (path.extname(name)) return specifier;
  const file = /(^|\/)\.{1,2}$/.test(name) ? `${name}/index` : name.endsWith('/') ? `${name}index` : name;
  return `${file}.js${suffix}`;
}

/** Parse actual module specifiers so strings and comments containing import text stay unchanged. */
function fixImportsAndExports(filePath) {
  let contents = fs.readFileSync(filePath, 'utf8');
  const source = ts.createSourceFile(filePath, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const edits = [];
  function visit(node) {
    let specifier;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
    else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      specifier = node.arguments[0];
    }
    if (specifier && ts.isStringLiteral(specifier)) {
      const replacement = fixSpecifier(specifier.text);
      if (replacement !== specifier.text) {
        edits.push({ start: specifier.getStart(source) + 1, end: specifier.end - 1, replacement });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    contents = contents.slice(0, edit.start) + edit.replacement + contents.slice(edit.end);
  }
  if (edits.length) fs.writeFileSync(filePath, contents);
}

const directory = process.argv[2] ?? fileURLToPath(new URL('../build/esm/', import.meta.url));
for (const file of walk(directory)) {
  if (file.endsWith('.js')) fixImportsAndExports(file);
}
