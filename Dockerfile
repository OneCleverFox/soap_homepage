# Dockerfile für Backend (Railway Deployment)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install platform-specific dependencies for Sharp
RUN apk add --no-cache \
    vips-dev \
    python3 \
    make \
    g++

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies (Sharp wird automatisch für Alpine kompiliert)
RUN npm ci --only=production

# Copy backend source code
COPY backend/src ./src
COPY backend/.env.vault ./

# Create necessary directories
RUN mkdir -p uploads/products && \
    mkdir -p logs

# Set proper permissions
RUN chown -R node:node /app
USER node

# Expose port (Railway sets this automatically)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "src/startup.js"]