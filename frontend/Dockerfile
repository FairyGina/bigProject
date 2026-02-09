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

# Build the application
RUN npm run build


# Production stage
FROM nginx:alpine

# Copy our config as a template for envsubst
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Default environment variables for Nginx proxy pass
# Azure Container Apps internal DNS: http://<app-name>:<port>
ENV BACKEND_URL=http://bp-backend-app:8080

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
