#!/bin/sh
# Rebuild the per-week zips students download. Run from the repo root.
cd docs/starters || exit 1
for w in week-*; do
  rm -f "../downloads/$w.zip"
  zip -qrj "../downloads/$w.zip" "$w"
  echo "built docs/downloads/$w.zip"
done
