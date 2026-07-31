# ==========================================
# STAGE 1: Build the SPA Application using Bun
# ==========================================
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Ensure we install dependencies strictly from the lockfile
COPY package.json bun.lock* bun.lockb* ./

# Install dependencies using Bun
RUN bun install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the application for production
RUN bun run build

# ==========================================
# STAGE 2: Secure, High-Performance Nginx Run stage
# ==========================================
FROM nginx:1.27-alpine AS runner

# Copy custom high-performance, secure Nginx configuration.
# security-headers.conf is `include`d by every location block in nginx.conf —
# nginx's add_header does not inherit, so the set has to be repeated per location.
# nginx fails to start if the include is missing, so a forgotten COPY here surfaces
# immediately rather than as a silently header-less deployment.
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf

# Copy production assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Security Hardening: Configure non-root unprivileged execution
# This protects against container-escape vulnerabilities.
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    mkdir -p /var/run/nginx && \
    chown -R nginx:nginx /var/run/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Run as the unprivileged 'nginx' user
USER nginx

# Expose port 8080 (non-root standard)
EXPOSE 8080

# Healthcheck to allow orchestrators (Docker Compose, Kubernetes) to monitor container status
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
