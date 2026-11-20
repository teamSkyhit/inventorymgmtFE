#!/usr/bin/env bash
# Assemble a self-contained Next.js standalone release after `next build`.
#
#   .next/standalone/                <- server.js + traced node_modules
#   .next/standalone/.next/static    <- copied from .next/static
#   .next/standalone/public          <- copied from public/
#   .next/standalone/ecosystem.config.js
#
# Usage: scripts/deploy/assemble-standalone.sh [output-tarball]
set -Eeuo pipefail

cd "$(dirname "$0")/../.."

OUT="${1:-}"
STANDALONE=".next/standalone"

if [[ ! -f "$STANDALONE/server.js" ]]; then
  echo "error: $STANDALONE/server.js not found. Run 'npm run build' first (output: \"standalone\")." >&2
  exit 1
fi

rm -rf "$STANDALONE/.next/static" "$STANDALONE/public"
mkdir -p "$STANDALONE/.next"
cp -R .next/static "$STANDALONE/.next/static"
if [[ -d public ]]; then
  cp -R public "$STANDALONE/public"
fi
cp ecosystem.config.js "$STANDALONE/ecosystem.config.js"

# Never ship env files baked from the build machine; the server links
# shared/.env into each release instead.
rm -f "$STANDALONE"/.env "$STANDALONE"/.env.*

echo "Assembled $STANDALONE ($(du -sh "$STANDALONE" | cut -f1))"

if [[ -n "$OUT" ]]; then
  tar -czf "$OUT" -C "$STANDALONE" .
  echo "Packed $OUT ($(du -h "$OUT" | cut -f1))"
fi
