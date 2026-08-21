#!/usr/bin/env bash
#
# build-media.sh — turn raw screen/phone recordings into web-ready clips.
#
# Drop originals into docs/media/src/ named after the slot they fill, then run
# this script. Output lands in docs/media/ as a VP9 .webm, an H.264 .mp4
# fallback, and a .jpg poster frame. Only the output is committed; the src/
# directory is gitignored.
#
#   docs/media/src/controller.mov  ->  docs/media/controller.{webm,mp4,jpg}
#
# Slots the site expects: hero, controller, simulator, training.
# Anything else you drop in is still transcoded — just reference it yourself.
#
# Usage:
#   docs/tools/build-media.sh                 # build everything in src/
#   docs/tools/build-media.sh controller      # build one slot
#   START=4 DURATION=8 docs/tools/build-media.sh controller   # trim first
#
# Env overrides:
#   START     seek to this second before encoding (default: 0)
#   DURATION  encode only this many seconds (default: whole clip)
#   WIDTH     output width, height auto, even-rounded (default: 1280)
#   FPS       output frame rate (default: 24)
#   CROP      ffmpeg crop filter, e.g. "ih*16/9:ih" to landscape a portrait clip

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA="$(cd "$HERE/.." && pwd)/media"
SRC="$MEDIA/src"

WIDTH="${WIDTH:-1280}"
FPS="${FPS:-24}"
START="${START:-0}"

command -v ffmpeg >/dev/null 2>&1 || { echo "error: ffmpeg not found" >&2; exit 1; }
[ -d "$SRC" ] || { echo "error: $SRC does not exist" >&2; exit 1; }

build_one() {
  local src="$1"
  local slot
  slot="$(basename "${src%.*}")"

  local vf="scale=${WIDTH}:-2,fps=${FPS}"
  [ -n "${CROP:-}" ] && vf="crop=${CROP},${vf}"

  local trim=(-ss "$START")
  [ -n "${DURATION:-}" ] && trim+=(-t "$DURATION")

  echo "==> $slot"

  # VP9 — primary source, best size/quality on the cream layout
  ffmpeg -hide_banner -loglevel error -y "${trim[@]}" -i "$src" \
    -an -vf "$vf" -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -deadline good \
    "$MEDIA/$slot.webm"

  # H.264 — Safari / older browser fallback
  ffmpeg -hide_banner -loglevel error -y "${trim[@]}" -i "$src" \
    -an -vf "$vf" -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p \
    -movflags +faststart "$MEDIA/$slot.mp4"

  # poster frame from ~40% in, so it is not a black lead-in
  local dur mid
  dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src" 2>/dev/null || echo 1)"
  mid="$(awk -v d="$dur" -v s="$START" -v t="${DURATION:-0}" \
    'BEGIN { span = (t > 0 ? t : d - s); printf "%.2f", s + span * 0.4 }')"
  ffmpeg -hide_banner -loglevel error -y -ss "$mid" -i "$src" \
    -frames:v 1 -vf "$vf" -q:v 4 "$MEDIA/$slot.jpg"

  ls -lh "$MEDIA/$slot.webm" "$MEDIA/$slot.mp4" "$MEDIA/$slot.jpg" |
    awk '{ printf "    %-10s %s\n", $5, $9 }'
}

if [ "$#" -gt 0 ]; then
  for slot in "$@"; do
    match="$(find "$SRC" -maxdepth 1 -type f -name "$slot.*" | head -1)"
    [ -n "$match" ] || { echo "error: no $SRC/$slot.* found" >&2; exit 1; }
    build_one "$match"
  done
else
  found=0
  while IFS= read -r f; do
    found=1
    build_one "$f"
  done < <(find "$SRC" -maxdepth 1 -type f \
             \( -iname '*.mov' -o -iname '*.mp4' -o -iname '*.webm' -o -iname '*.mkv' -o -iname '*.avi' \) | sort)
  [ "$found" -eq 1 ] || echo "nothing to build — drop recordings into $SRC/"
fi
