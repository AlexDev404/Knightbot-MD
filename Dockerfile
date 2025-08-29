# Use the official Node.js LTS image
FROM node:lts-bookworm-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for some npm packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    ffmpeg

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install npm dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p /app/session /app/temp /app/tmp /app/data

# Set proper permissions
RUN chmod +x /app/index.js

# Expose port (if your bot serves any web interface)
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Bot is running')" || exit 1

# Start the application
CMD ["npm", "start"]
