# Pamoja in production (§17.4): the app compiled into one binary, on a
# minimal Alpine. Built and published by .github/workflows/publish.yml; the
# machine only pulls it (docs/deploiement.md).

# Stage 1: the bundle, the CSS and the binary
FROM denoland/deno:alpine-2.9.8 AS build
WORKDIR /app

# The SQLite library the binary opens (@db/sqlite, through FFI)
RUN apk add --no-cache sqlite-libs

# Only what the build reads: see .dockerignore
COPY . .

# The bundle and its CSS into dist/, from an empty folder (task-prod.ts)
RUN deno task prod:build
# Without node_modules: it holds the build tools (esbuild, Tailwind), which
# the server never runs. Only the packages the server imports go in.
RUN rm -rf node_modules && deno compile \
  --allow-all \
  --no-check \
  --node-modules-dir=none \
  --include=dist \
  --include=migrations \
  --output pamoja \
  deploy/main.ts

# Stage 2: the binary alone. The compiled binary needs glibc, which Alpine
# lacks: it is taken from the Deno image, as Tournament does.
FROM alpine:3.22
WORKDIR /app

# For x86_64, ld-linux is in /lib64; for arm64, in /lib
COPY --from=build /lib64 /lib64
COPY --from=build /lib/ld-linux-* /lib/
COPY --from=build /usr/local/lib/ /usr/local/lib/
COPY --from=build /usr/lib/libsqlite3.so* /usr/lib/
COPY --from=build /app/pamoja /app/pamoja

ENV LD_LIBRARY_PATH=/usr/local/lib/glibc \
  DENO_SQLITE_PATH=/usr/lib/libsqlite3.so.0 \
  APP_ENV=prod \
  BASE_URL=/ \
  PORT=8000 \
  DATABASE_PATH=/data/pamoja.db \
  MEDIA_DIR=/data/media \
  BACKUP_DIR=/data/backups

# Not root: the app writes only its volume
RUN adduser -D -H -u 10001 pamoja \
  && mkdir -p /data \
  && chown pamoja /data
USER pamoja

EXPOSE 8000

# The wget of Alpine (busybox): no other tool in the image
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8000/ || exit 1
ENTRYPOINT ["/app/pamoja"]
