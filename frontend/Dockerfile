# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Accept the backend URL as a build argument.
# - Local Compose: left blank — Nginx proxies to the backend container.
# - Render Static Site: set to the live backend URL (e.g. https://turing-backend.onrender.com)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage — production-grade Nginx
FROM nginx:alpine

# Copy built Vite output
COPY --from=build /app/dist /usr/share/nginx/html

# Copy our proper nginx config (replaces the default)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
