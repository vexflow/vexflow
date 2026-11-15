# Vexflow repository guidance

## Scope and workflow

## Dependencies

- Prefer the language/platform standard library and small, readable local implementations.
- Remove dependencies when doing so is simpler and safer than retaining them.
- Use well-known, trusted, maintained packages when a dependency earns its complexity.
- Do not implement cryptography or complex security protocols from scratch to reduce dependencies.
- Pin toolchains and lock dependencies. Review updates; avoid forced bulk fixes and unexplained overrides.

## Code readability

- Write for human debugging, audit, and interpretation.
- Add a short file header describing the contents of each new or substantively changed source file.
- Comment constants, functions, methods, structs, interfaces, and other significant declarations.
- Explain intent, invariants, failure behavior, and non-obvious decisions.
- Split long functions into named steps. Clearly comment complex blocks that remain.
- Prefer explicit control flow, descriptive names, and straightforward data structures.
- Keep generated/vendor assets clearly identified; do not manually annotate generated code.

## Documentation

- Keep documentation clean and human readable. The README.md should remain high-level, with pointers to docs/ as needed.
- Use short sentences, bullets, tables, code blocks, and concrete examples.
- Put detailed setup, architecture, testing, security, and deployment notes in `docs/`.
- Avoid long prose paragraphs and duplicated instructions.
