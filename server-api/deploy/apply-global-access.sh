#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/unique-launcher-api}"
SERVICE_NAME="${SERVICE_NAME:-unique-launcher-api}"
DOMAIN="${DOMAIN:-launcher-api.unique-csgo.ru}"
API_PORT="${API_PORT:-48129}"
NGINX_SITE="/etc/nginx/sites-available/${SERVICE_NAME}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash server-api/deploy/apply-global-access.sh" >&2
  exit 1
fi

set_env() {
  local key="$1"
  local value="$2"
  local env_file="${APP_DIR}/.env"

  touch "$env_file"
  chmod 600 "$env_file"

  if grep -qE "^${key}=" "$env_file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$env_file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$env_file"
  fi
}

set_env API_HOST "0.0.0.0"
set_env TRUST_PROXY "1"
set_env CORS_ORIGIN "*"
set_env RATE_LIMIT_WINDOW_MS "60000"
set_env RATE_LIMIT_MAX "1200"
set_env AUTH_RATE_LIMIT_MAX "120"

cat > "$NGINX_SITE" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} 213.108.170.58;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://${DOMAIN}\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} 213.108.170.58;

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    client_max_body_size 96m;
    keepalive_timeout 65;
    proxy_connect_timeout 15s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;

    location / {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/${SERVICE_NAME}"

if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp >/dev/null || true
  ufw allow 443/tcp >/dev/null || true
fi

nginx -t
systemctl reload nginx
systemctl restart "$SERVICE_NAME"

curl -fsS "https://${DOMAIN}/health" >/dev/null
echo "API global access config applied for https://${DOMAIN}"
