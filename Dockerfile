###############################################
# Multi-stage Dockerfile for Strawberry Toolserver
###############################################

# ---------------------------
# Build Stage
# ---------------------------
FROM node:23.3.0-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files and install all dependencies (including devDependencies)
COPY package*.json tsconfig.json ./
RUN npm install

# Copy application source code
COPY . ./

# Build the TypeScript code
RUN npm run build

# ---------------------------
# Production Stage
# ---------------------------
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set Node environment to production
ENV NODE_ENV=production

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy compiled code from the builder stage
COPY --from=builder /app/dist ./dist

# Run as non-root for security
USER node

# Expose port 3000 (adjust port mapping if necessary, as the server selects a free port between 3000 and 3100)
EXPOSE 3000

# Start the server using the production start command
CMD ["npm", "start"] 