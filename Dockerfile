FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
RUN apk add --no-cache \
    chromium \
    tini \
    ca-certificates \
    freetype \
    fontconfig \
    harfbuzz \
    ttf-freefont \
    nss \
    dbus

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    UPDATE_INTERVAL=900000 \
    NODE_ENV=production \
    HOME=/app

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY . .

RUN addgroup -g 10001 botgroup \
    && adduser -D -u 10001 -G botgroup -s /sbin/nologin botuser \
    && chown -R 10001:10001 /app

USER 10001:10001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD pgrep -x node || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--unhandled-rejections=strict", "index.js"]