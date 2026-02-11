# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Accept build argument for API URL
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Accept build argument for Chatbot URL
ARG VITE_CHATBOT_URL
ENV VITE_CHATBOT_URL=${VITE_CHATBOT_URL}

# Accept build argument for Google Maps API Key
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

# Build the application
RUN npm run build


# Production stage
FROM nginx:alpine

# Install gettext for envsubst (already included in nginx:alpine but ensure it's available)
RUN apk add --no-cache gettext

# Copy nginx config as template
COPY nginx.conf /etc/nginx/nginx.conf.template

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Default environment variables for Nginx proxy pass
# Azure Container Apps internal DNS: http://<app-name>:<port>
ENV BACKEND_URL=http://bp-backend-app:8080

EXPOSE 80

# Use envsubst with explicit variable list to prevent Nginx variables from being substituted
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
