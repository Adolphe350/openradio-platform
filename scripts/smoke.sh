#!/bin/bash
# Usage: scripts/smoke.sh BASE OUTDIR [PREFIX]   (EMAIL/PASSWORD/SHOTS/ONLY from env)
# Runs scripts/smoke.cjs in the Playwright Docker image as the current user.
BASE="$1"; OUTDIR="$2"; PREFIX="${3:-}"
mkdir -p "$OUTDIR"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
docker run --rm --network host --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -e BASE="$BASE" -e OUT=/out -e PREFIX="$PREFIX" -e EMAIL="$EMAIL" -e PASSWORD="$PASSWORD" \
  -e SHOTS="${SHOTS:-1}" -e ONLY="${ONLY:-}" \
  -v "$HERE":/w:ro -v "$OUTDIR":/out -w /w mcr.microsoft.com/playwright:v1.64.1-noble \
  bash -c "npm i --silent --no-save --prefix /tmp/pw playwright-core@1.64.1 >/dev/null 2>&1 && NODE_PATH=/tmp/pw/node_modules node scripts/smoke.cjs"
