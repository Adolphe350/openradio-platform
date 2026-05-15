FROM debian:bookworm-slim

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    icecast2 gettext-base ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /var/log/icecast2 \
  && chown -R icecast2:icecast /var/log/icecast2 \
  && chown -R icecast2:icecast /usr/share/icecast2

COPY docker/icecast/start.sh /usr/local/bin/start-icecast
COPY docker/icecast/icecast.xml.template /etc/icecast2/icecast.xml.template
RUN chmod +x /usr/local/bin/start-icecast

EXPOSE 8000
CMD ["start-icecast"]
