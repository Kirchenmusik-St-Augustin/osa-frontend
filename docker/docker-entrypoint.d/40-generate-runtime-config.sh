#!/bin/sh
set -eu

# Renders public/config.template.js (copied verbatim into dist/ by Vite, then
# into /usr/share/nginx/html by the Dockerfile's final COPY) into config.js
# using the container's real runtime env vars. Runs automatically because
# nginx:1-alpine's own /docker-entrypoint.sh executes every executable
# *.sh file in /docker-entrypoint.d/ before starting nginx.
#
# Writes the generated file under /run instead of alongside the static
# assets in /usr/share/nginx/html: that directory is part of the
# container's read-only image layer, so the template itself stays
# read-only baked-in (safe -- nginx.conf denies direct access to it) while
# only the generated output needs a writable directory. /run is already
# tmpfs-backed by Podman's ReadOnlyTmpfs default (see osa-deploy's
# osa-frontend Quadlet), so this needs no extra mount.
#
# Fails loudly (nonzero exit + clear stderr message) if any required
# variable is missing, instead of silently defaulting.

HTML_ROOT="/usr/share/nginx/html"
TEMPLATE="$HTML_ROOT/config.template.js"
OUTPUT_DIR="/run/frontend-config"
OUTPUT="$OUTPUT_DIR/config.js"

require_env() {
  var_name="$1"
  eval "value=\${$var_name:-}"
  if [ -z "$value" ]; then
    echo "FATAL: required environment variable $var_name is not set. Aborting." >&2
    exit 1
  fi
}

require_env API_BASE_URL
require_env APP_ENVIRONMENT

# Optional: Google Sign-In stays a graceful no-op (button doesn't render)
# when unset, mirroring the backend's own GOOGLE_CLIENT_ID-optional pattern.
: "${GOOGLE_CLIENT_ID:=}"

if [ ! -f "$TEMPLATE" ]; then
  echo "FATAL: $TEMPLATE not found. Aborting." >&2
  exit 1
fi

export API_BASE_URL APP_ENVIRONMENT GOOGLE_CLIENT_ID

mkdir -p "$OUTPUT_DIR"
envsubst '${API_BASE_URL} ${APP_ENVIRONMENT} ${GOOGLE_CLIENT_ID}' < "$TEMPLATE" > "$OUTPUT"

echo "Generated runtime config.js from container environment."
