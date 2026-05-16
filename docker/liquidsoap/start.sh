#!/bin/sh
set -eu

ICECAST_HOST="${LIQ_ICECAST_HOST:-icecast}"
ICECAST_PORT="${LIQ_ICECAST_PORT:-8000}"
ICECAST_PASSWORD="${LIQ_ICECAST_PASSWORD:-sourcepass}"
STREAM_MOUNT="${LIQ_STREAM_MOUNT:-/demo.mp3}"
STREAM_NAME="${LIQ_STREAM_NAME:-OpenRadio Demo}"
STREAM_DESCRIPTION="${LIQ_STREAM_DESCRIPTION:-Baseline AutoDJ stream}"
STREAM_GENRE="${LIQ_STREAM_GENRE:-Mixed}"
STREAM_URL="${LIQ_STREAM_URL:-http://localhost:3000}"

cat > /tmp/openradio-autodj.liq << LIQEOF
settings.log.stdout.set(true)
settings.server.telnet.set(false)

autodj_playlist = playlist(
  id="openradio_autodj",
  mode="random",
  reload_mode="watch",
  "/media"
)

radio = fallback(track_sensitive=false, [autodj_playlist, blank()])

radio = mksafe(radio)

output.icecast(
  %mp3(bitrate=192, samplerate=44100, stereo=true),
  host="${ICECAST_HOST}",
  port=${ICECAST_PORT},
  password="${ICECAST_PASSWORD}",
  mount="${STREAM_MOUNT}",
  name="${STREAM_NAME}",
  description="${STREAM_DESCRIPTION}",
  genre="${STREAM_GENRE}",
  url="${STREAM_URL}",
  radio
)
LIQEOF

exec liquidsoap /tmp/openradio-autodj.liq
