#!/usr/bin/env bash
set -euo pipefail

echo "== 1. dist 不得含任何點陣圖資產 =="
n=$(find dist -type f \( -name "*.jpeg" -o -name "*.jpg" -o -name "*.webp" -o -name "*.gif" \) | wc -l | tr -d ' ')
echo "raster assets in dist: $n"
[ "$n" = "0" ] || { echo "FAIL: 個人版資產洩漏"; exit 1; }

echo "== 2. JS/CSS 不得含 personal 字串 =="
if rg -q "kawaii-pastel|粉彩甜心|PERSONAL_PACKS" dist/assets/*.js dist/assets/*.css 2>/dev/null; then
  echo "FAIL: personal 字串洩漏"; exit 1
fi

echo "PASS: release gate clean"
