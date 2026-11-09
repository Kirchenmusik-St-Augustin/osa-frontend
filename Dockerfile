FROM docker.io/library/node:24-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
ARG VITE_APP_ENVIRONMENT=production
ENV VITE_APP_ENVIRONMENT=$VITE_APP_ENVIRONMENT
RUN npm run build

FROM docker.io/library/nginx:1-alpine@sha256:2db7d28517d1fba17c2da3210395f7be11a11b419246ad0da2edf782af72f367
COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/docker-entrypoint.d/40-generate-runtime-config.sh /docker-entrypoint.d/40-generate-runtime-config.sh
# nginx's own unprivileged user; binding port 80 then needs CAP_NET_BIND_SERVICE,
# which the deployment grants.
USER 101
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["wget", "-qO-", "http://127.0.0.1/"]
