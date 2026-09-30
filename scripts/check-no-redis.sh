#!/usr/bin/env bash
# CI regression guard: Redis must stay removed.
#
# v3.0.0 planned a Redis-backed cache but never wired it into app.ts; v3.1.0
# replaced it with the in-process MemoryCache (apps/api/src/services/cache.service.ts).
# This script fails the build if Redis references sneak back in.
#
# Prose mentions (e.g. a doc explaining "we do not use Redis") are allowed —
# only dependency names, env vars and runtime imports are checked.
set -euo pipefail
cd "$(dirname "$0")/.."

matches=$(grep -rnE "ioredis|REDIS_[A-Z_]+|from ['\"]redis['\"]|require\(['\"]redis['\"]\)|[@/]redis" \
  apps/ packages/ \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" \
  --include="*.json" --include="*.yml" --include="*.yaml" --include="*.env*" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
  || true)

# The dependency name also appears in lockfiles / package manifests — those are
# exactly what we want to catch, so no exclusions there.

if [ -n "$matches" ]; then
  echo "ERROR: Redis references found (Redis was removed in v3.1.0):"
  echo "$matches"
  echo ""
  echo "Fix: use MemoryCache from apps/api/src/services/cache.service.ts instead."
  exit 1
fi

echo "OK: no Redis references"
