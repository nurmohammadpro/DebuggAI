#!/bin/bash
set -euo pipefail

# DebuggAI Production Server Setup
# Run on a fresh Ubuntu 22.04/24.04 instance as root or a sudo user.
#
# Usage: ssh root@<host> 'bash -s' < setup.sh
#    or: chmod +x setup.sh && sudo ./setup.sh

echo "=== DebuggAI Server Setup ==="

# ---------- System packages ----------
echo "[1/7] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

echo "[2/7] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs

echo "[3/7] Installing Docker..."
curl -fsSL https://get.docker.com | sh
usermod -aG docker debuggai 2>/dev/null || true
systemctl enable docker

echo "[4/7] Installing Caddy..."
apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update -qq && apt-get install -y -qq caddy

echo "[5/7] Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[6/7] Creating debuggai user..."
id -u debuggai &>/dev/null || useradd -m -s /bin/bash -G docker debuggai
mkdir -p /home/debuggai/app /home/debuggai/backups
chown -R debuggai:debuggai /home/debuggai

echo "[7/7] Placing config files..."
cp /tmp/Caddyfile /etc/caddy/Caddyfile 2>/dev/null || echo "  (place Caddyfile at /etc/caddy/Caddyfile)"
cp /tmp/debuggai.service /etc/systemd/system/debuggai.service 2>/dev/null || echo "  (place debuggai.service at /etc/systemd/system/)"
systemctl daemon-reload
systemctl enable caddy
systemctl restart caddy

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Clone the repo to /home/debuggai/app"
echo "  2. Copy .env.production to /home/debuggai/app/.env"
echo "  3. Start: systemctl start debuggai"
