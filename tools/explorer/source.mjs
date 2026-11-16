// Map notation provenance to an unambiguous literal in the existing Prism-tokenized editor.

/** Flatten Prism tokens without interpreting or executing editable JavaScript. */
function tokenText(token) {
  if (typeof token === 'string') return token;
  if (Array.isArray(token)) return token.map(tokenText).join('');
  return tokenText(token.content);
}

/**
 * Match only one complete, unescaped string literal. Comments and regexes are excluded by Prism.
 * Escaped, interpolated, repeated, or computed inputs remain inspectable, without guessed offsets.
 */
export function findNotationRange(code, source, prism) {
  if (!source || source.input.includes('\\') || source.input.includes('${')) return undefined;
  if (source.start < 0 || source.end < source.start || source.end > source.input.length) return undefined;
  const matches = [];
  let offset = 0;
  for (const token of prism.tokenize(code, prism.languages.javascript)) {
    const text = tokenText(token);
    if (
      ['string', 'template-string'].includes(token.type) &&
      text.slice(1, -1) === source.input &&
      text[0] === text.at(-1)
    ) {
      matches.push({ start: offset + 1 + source.start, end: offset + 1 + source.end });
    }
    offset += text.length;
  }
  return matches.length === 1 ? matches[0] : undefined;
}
