#!/bin/sh
set -eu

export ICECAST_HOSTNAME="${ICECAST_HOSTNAME:-icecast}"
export ICECAST_SOURCE_PASSWORD="${ICECAST_SOURCE_PASSWORD:-sourcepass}"
export ICECAST_ADMIN_PASSWORD="${ICECAST_ADMIN_PASSWORD:-adminpass}"
export ICECAST_RELAY_PASSWORD="${ICECAST_RELAY_PASSWORD:-relaypass}"
export ICECAST_ADMIN_USER="${ICECAST_ADMIN_USER:-admin}"
export ICECAST_ADMIN_EMAIL="${ICECAST_ADMIN_EMAIL:-admin@openradio.local}"

envsubst < /etc/icecast2/icecast.xml.template > /etc/icecast2/icecast.xml

exec icecast2 -n -c /etc/icecast2/icecast.xml
