#!/bin/sh
# Compatibility entry point. Run from the repo root; outputs stay under build/.
exec node tools/visual-regression.mjs "$@"
