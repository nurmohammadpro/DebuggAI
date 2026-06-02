#!/bin/sh
# Entrypoint: fix Docker socket permissions so the node user can access it.
set -e

DOCKER_SOCK="/var/run/docker.sock"

if [ -S "$DOCKER_SOCK" ]; then
  # Make socket accessible by anyone (simplest, container is isolated anyway)
  chmod 666 "$DOCKER_SOCK" 2>/dev/null || true
fi

# Run the CMD as the node user
exec su -s /bin/sh node -c "$*"
