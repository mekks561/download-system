#!/usr/bin/env bash
# CI regression guard: React 19 deprecated APIs must stay removed.
#
# v3.1.0 migrated apps/web off forwardRef / useContext / defaultProps to the
# React 19 idioms (ref as a prop, use() hook). This script fails the build if
# they come back.
#
# NOTE: word-boundary matching (\b) is required here — a plain "useContext"
# grep produces a false positive on the project's own `useContextMenu` hook.
set -euo pipefail
cd "$(dirname "$0")/.."

targets=(apps/web/src)
[ -d apps/desktop/src ] && targets+=(apps/desktop/src)

matches=$(grep -rnE "\b(forwardRef|useContext|defaultProps)\b" "${targets[@]}" \
  --include="*.tsx" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
  || true)

if [ -n "$matches" ]; then
  echo "ERROR: React 19 deprecated APIs found:"
  echo "$matches"
  echo ""
  echo "Fix: pass ref as a normal prop, use use(Context) instead of useContext,"
  echo "and drop defaultProps in favour of default parameter values."
  exit 1
fi

echo "OK: no React 19 deprecated APIs (forwardRef / useContext / defaultProps)"
