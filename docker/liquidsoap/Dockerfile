FROM savonet/liquidsoap:v2.3.3

USER root
RUN mkdir -p /opt/openradio /media
COPY docker/liquidsoap/start.sh /opt/openradio/start.sh
RUN chmod +x /opt/openradio/start.sh

# The base liquidsoap image sets ENTRYPOINT ["/usr/bin/liquidsoap"], which would
# cause CMD args to be passed to liquidsoap instead of the shell.  Reset it so
# start.sh executes as a plain shell script.
ENTRYPOINT ["/bin/sh", "/opt/openradio/start.sh"]
CMD []
