#!/bin/sh
set -eu

ICECAST_HOST="${LIQ_ICECAST_HOST:-icecast}"
ICECAST_PORT="${LIQ_ICECAST_PORT:-8000}"
ICECAST_PASSWORD="${LIQ_ICECAST_PASSWORD:-sourcepass}"
APP_BASE_URL="${LIQ_APP_BASE_URL:-http://app:3000}"
POLL_SECRET="${LIQ_POLL_SECRET:-openradio-internal}"

CONFIG_DIR="/configs"
MEDIA_DIR="/media"
UPLOAD_DIR="/uploads"

echo "[openradio] Liquidsoap orchestrator starting..."

# Generate fallback demo script if no per-station configs exist yet
write_demo_script() {
  cat <<EOF_LIQ >/tmp/openradio-demo.liq
set("log.stdout", true)
set("server.telnet", false)

demo = playlist(
  id="openradio_demo",
  mode="random",
  reload_mode="watch",
  "${MEDIA_DIR}"
)

radio = fallback(track_sensitive=false, [demo, blank()])

output.icecast(
  %mp3(bitrate=128, samplerate=44100, stereo=true),
  host="${ICECAST_HOST}",
  port=${ICECAST_PORT},
  password="${ICECAST_PASSWORD}",
  mount="/demo.mp3",
  name="OpenRadio Demo",
  description="Baseline AutoDJ stream",
  genre="Mixed",
  url="${APP_BASE_URL}",
  radio
)
EOF_LIQ
  echo "[openradio] No station configs found — running demo stream on /demo.mp3"
  exec liquidsoap /tmp/openradio-demo.liq
}

# Watch loop: start one liquidsoap process per .liq config file.
# When a new config is written, pick it up on the next restart cycle.
run_station_configs() {
  pids=""

  for liq_file in "${CONFIG_DIR}"/*.liq; do
    [ -f "$liq_file" ] || continue
    station_id="$(basename "$liq_file" .liq)"
    echo "[openradio] Starting AutoDJ for station: ${station_id}"
    liquidsoap "$liq_file" &
    pids="$pids $!"
  done

  if [ -z "$pids" ]; then
    write_demo_script
  fi

  # Keep container alive; if any child exits, restart everything
  wait $pids
  echo "[openradio] A station process exited — restarting in 5s..."
  sleep 5
  exec sh "$0"
}

run_station_configs
