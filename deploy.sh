#!/usr/bin/env bash
# ============================================================
# Velo Pharma — Vercel Deploy Script
# ============================================================
# Usage:
#   1. Get a fresh Vercel token: https://vercel.com/account/tokens
#   2. Run:  bash deploy.sh <YOUR_VERCEL_TOKEN>
#   3. Or export it:  VERCEL_TOKEN=xxx bash deploy.sh
# ============================================================
set -e

TOKEN="${1:-$VERCEL_TOKEN}"
if [ -z "$TOKEN" ]; then
  echo "❌ No token provided."
  echo "   Usage: bash deploy.sh <VERCEL_TOKEN>"
  echo "   Get one at: https://vercel.com/account/tokens"
  exit 1
fi

cd "$(dirname "$0")"

echo "🚀 Deploying Velo Pharma to Vercel..."
# Install deps if needed
[ -d node_modules ] || npm install --no-audit --no-fund
# Build
npm run build
# Deploy to production
vercel deploy --yes --prod --token="$TOKEN"

echo ""
echo "✅ Done! Your Velo Pharma ERP is live."
