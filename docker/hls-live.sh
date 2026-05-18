#!/bin/sh
set -eu

mkdir -p /hls/urban-radio-rwanda

while true; do
  ffmpeg -hide_banner -loglevel warning -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5 \
    -i http://icecast:8000/urban-radio-rwanda.mp3 \
    -vn -c:a aac -b:a 128k -ac 2 -ar 44100 \
    -f hls -hls_time 4 -hls_list_size 6 -hls_flags delete_segments+append_list+independent_segments \
    -hls_delete_threshold 2 -hls_allow_cache 0 \
    -hls_segment_filename /hls/urban-radio-rwanda/segment_%06d.ts \
    /hls/urban-radio-rwanda/index.m3u8 || true
  sleep 2
done
