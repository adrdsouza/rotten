# Nginx with Brotli support for Rotten Hand
# Using pre-built image with Brotli support
FROM macbre/nginx-brotli:latest

# Create directories for configuration and SSL
RUN mkdir -p /etc/nginx/conf.d /etc/nginx/ssl /var/log/nginx /etc/letsencrypt/live

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY rottenhand.conf /etc/nginx/conf.d/rottenhand.conf

# Expose ports
EXPOSE 80 443

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
