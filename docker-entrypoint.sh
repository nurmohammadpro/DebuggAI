#!/bin/sh
# Entrypoint: fix Docker socket permissions and drop privileges.
set -e

DOCKER_SOCK="/var/run/docker.sock"

if [ -S "$DOCKER_SOCK" ]; then
  chmod 666 "$DOCKER_SOCK" 2>/dev/null || true
fi

# Drop to node user using gosu (installed via apt in Dockerfile)
exec gosu node "$@"
