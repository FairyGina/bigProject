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

# Build the application
RUN npm run build


# Production stage
FROM nginx:alpine

# Copy our config as a template for envsubst
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Default environment variables for Nginx proxy pass
ENV BACKEND_URL=http://backend:8080
ENV ANALYSIS_ENGINE_URL=http://analysis-engine:8000
ENV CHATBOT_URL=http://ai-chatbot:7860

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
