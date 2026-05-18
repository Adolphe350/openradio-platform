#!/bin/sh
set -eu

STATION_SLUG="${HLS_STATION_SLUG:-urban-radio-rwanda}"
ICECAST_MOUNT="${HLS_ICECAST_MOUNT:-urban-radio-rwanda.mp3}"
STREAM_URL="${HLS_STREAM_URL:-http://icecast:8000/${ICECAST_MOUNT}}"
OUTPUT_DIR="${HLS_OUTPUT_DIR:-/hls/${STATION_SLUG}}"
PLAYLIST="${OUTPUT_DIR}/index.m3u8"
SEGMENT_PATTERN="${OUTPUT_DIR}/segment_%06d.ts"

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

mkdir -p "$OUTPUT_DIR"

# Do not serve an old live playlist after a container restart. The app will return
# 404 for a few seconds until fresh segments are available instead of exposing
# stale media from a previous deployment.
rm -f "$PLAYLIST" "$OUTPUT_DIR"/segment_*.ts 2>/dev/null || true

while true; do
  log "Waiting for Icecast stream: ${STREAM_URL}"
  until ffmpeg -hide_banner -nostdin -loglevel error -t 1 -i "$STREAM_URL" -f null - >/dev/null 2>&1; do
    sleep 2
  done

  log "Starting HLS packaging for ${STREAM_URL} -> ${PLAYLIST}"
  ffmpeg -hide_banner -nostdin -loglevel warning \
    -reconnect 1 -reconnect_streamed 1 -reconnect_on_network_error 1 -reconnect_delay_max 5 \
    -i "$STREAM_URL" \
    -vn -c:a aac -b:a 128k -ac 2 -ar 44100 \
    -f hls -hls_time 4 -hls_list_size 6 \
    -hls_flags delete_segments+independent_segments+temp_file \
    -hls_delete_threshold 2 -hls_allow_cache 0 \
    -hls_segment_filename "$SEGMENT_PATTERN" \
    "$PLAYLIST" || true

  log "HLS packaging stopped; retrying in 2s"
  sleep 2
done
