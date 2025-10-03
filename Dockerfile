# Dockerfile für Backend (Railway Deployment)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/src ./src
COPY backend/.env.vault ./

# Create uploads directory
RUN mkdir -p uploads

# Expose port (Railway sets this automatically)
EXPOSE 5000

# Start the application
CMD ["node", "src/server.js"]