FROM node:18-alpine

WORKDIR /app

# Build tools for native modules (e.g. sharp on Alpine)
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
    vips-dev \
    python3 \
    make \
    g++

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install production dependencies for backend only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend application source
COPY src ./src
COPY scripts ./scripts
COPY assets ./assets

RUN mkdir -p uploads/products && \
  mkdir -p logs

RUN chown -R node:node /app
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "src/startup.js"]