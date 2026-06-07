FROM node:18-alpine

WORKDIR /app

# Build tools for native modules (e.g. sharp on Alpine)
RUN apk add --no-cache \
    vips-dev \
    python3 \
    make \
    g++

# Install production dependencies for backend only
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend application source
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/assets ./assets

RUN mkdir -p uploads/products && \
  mkdir -p logs

RUN chown -R node:node /app
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "src/startup.js"]