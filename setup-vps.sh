#!/bin/bash
# Script setup Nginx + SSL cho workshop.foundersnorth.com.vn

set -e

echo "=== 1. Cài Nginx ==="
apt update && apt install nginx -y

echo "=== 2. Tạo thư mục web ==="
mkdir -p /var/www/workshop

echo "=== 3. Cấu hình Nginx ==="
cat > /etc/nginx/sites-available/workshop.foundersnorth.com.vn << 'EOF'
server {
    listen 80;
    server_name workshop.foundersnorth.com.vn;
    root /var/www/workshop;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \.(jpg|jpeg|png|gif|webp|ico|woff|woff2|otf|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/workshop.foundersnorth.com.vn /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

echo "=== 4. Cài SSL (Let's Encrypt) ==="
apt install certbot python3-certbot-nginx -y
certbot --nginx -d workshop.foundersnorth.com.vn --non-interactive --agree-tos -m admin@foundersnorth.com.vn

echo "=== XONG! Site đã chạy trên https://workshop.foundersnorth.com.vn ==="
