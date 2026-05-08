FROM savonet/liquidsoap:v2.3.3

USER root
RUN mkdir -p /opt/openradio /media
COPY docker/liquidsoap/start.sh /opt/openradio/start.sh
RUN chmod +x /opt/openradio/start.sh

CMD ["sh", "/opt/openradio/start.sh"]
