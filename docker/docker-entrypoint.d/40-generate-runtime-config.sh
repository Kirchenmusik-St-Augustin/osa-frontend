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

# The browser sends every request, including the bearer token, to this
# address: only a path on the same origin or an https URL is acceptable.
case "$API_BASE_URL" in
  /* | https://*) ;;
  *)
    echo "FATAL: API_BASE_URL must start with / or https://. Aborting." >&2
    exit 1
    ;;
esac

case "$APP_ENVIRONMENT" in
  development | test | qa | production) ;;
  *)
    echo "FATAL: APP_ENVIRONMENT must be one of development, test, qa, production. Aborting." >&2
    exit 1
    ;;
esac

# Optional: Google Sign-In stays a graceful no-op (button doesn't render)
# when unset, mirroring the backend's own GOOGLE_CLIENT_ID-optional pattern.
: "${GOOGLE_CLIENT_ID:=}"

if [ ! -f "$TEMPLATE" ]; then
  echo "FATAL: $TEMPLATE not found. Aborting." >&2
  exit 1
fi

# The values are written into single-quoted JavaScript strings: escape the
# backslash and the quote, and refuse a line break, so that no value can end
# the string and turn into code (or break the file).
js_escape() {
  case "$1" in
    *"
"*) echo "FATAL: a runtime config value contains a line break. Aborting." >&2; exit 1 ;;
  esac
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e "s/'/\\\\'/g"
}

API_BASE_URL=$(js_escape "$API_BASE_URL")
APP_ENVIRONMENT=$(js_escape "$APP_ENVIRONMENT")
GOOGLE_CLIENT_ID=$(js_escape "$GOOGLE_CLIENT_ID")
export API_BASE_URL APP_ENVIRONMENT GOOGLE_CLIENT_ID

mkdir -p "$OUTPUT_DIR"
envsubst '${API_BASE_URL} ${APP_ENVIRONMENT} ${GOOGLE_CLIENT_ID}' < "$TEMPLATE" > "$OUTPUT"

echo "Generated runtime config.js from container environment."
