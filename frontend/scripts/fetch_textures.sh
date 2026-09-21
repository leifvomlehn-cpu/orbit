#!/usr/bin/env bash
set -u
BASE="https://www.solarsystemscope.com/textures/download"
DEST="$(cd "$(dirname "$0")/../public/textures" && pwd)"
mkdir -p "$DEST"
REQUIRED="2k_sun.jpg 2k_mercury.jpg 2k_venus_surface.jpg 2k_earth_daymap.jpg 2k_moon.jpg 2k_mars.jpg 2k_jupiter.jpg 2k_saturn.jpg 2k_saturn_ring_alpha.png 2k_uranus.jpg 2k_neptune.jpg 2k_ceres_fictional.jpg"
OPTIONAL="2k_haumea_fictional.jpg 2k_makemake_fictional.jpg 2k_eris_fictional.jpg"
fail=0
total=0
for f in $REQUIRED; do
  if curl -fsSL "$BASE/$f" -o "$DEST/$f"; then
    size=$(wc -c < "$DEST/$f" | tr -d ' ')
    total=$((total + size))
    printf 'OK     %s (%s Bytes)\n' "$f" "$size"
  else
    printf 'FEHLER %s\n' "$f"
    fail=1
  fi
done
for f in $OPTIONAL; do
  if curl -fsSL "$BASE/$f" -o "$DEST/$f"; then
    size=$(wc -c < "$DEST/$f" | tr -d ' ')
    total=$((total + size))
    printf 'OK     %s (optional, %s Bytes)\n' "$f" "$size"
  else
    printf 'SKIP   %s (optional, nicht gefunden)\n' "$f"
    rm -f "$DEST/$f"
  fi
done
printf 'Gesamt: %s Bytes (~%s MB)\n' "$total" "$((total / 1048576))"
exit $fail
