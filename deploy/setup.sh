#!/bin/bash
# Raven Server Setup Script
# Run this once on a fresh Ubuntu 24.04 Lightsail instance
set -e

echo "=== Raven Server Setup ==="

# 1. Update system
echo "→ Updating system..."
apt-get update && apt-get upgrade -y

# 2. Install Docker
echo "→ Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 3. Install Docker Compose
echo "→ Installing Docker Compose..."
apt-get install -y docker-compose-plugin

# 4. Install Nginx
echo "→ Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx

# 5. Install Git
echo "→ Installing Git..."
apt-get install -y git

# 6. Clone the repo
echo "→ Cloning Raven..."
cd /opt
git clone https://github.com/hendro2121/Raven.git raven
cd /opt/raven

# 7. Copy nginx config
echo "→ Configuring Nginx..."
cp deploy/nginx.conf /etc/nginx/sites-available/raven
ln -sf /etc/nginx/sites-available/raven /etc/nginx/sites-enabled/raven
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 8. Create .env file (user fills in secrets)
echo "→ Creating .env template..."
cat > /opt/raven/.env << 'ENVEOF'
# Raven Environment Variables — fill these in!
POSTGRES_PASSWORD=CHANGE_ME_TO_A_RANDOM_PASSWORD
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
JWT_SECRET=CHANGE_ME_TO_A_RANDOM_STRING
CRON_SECRET=CHANGE_ME_TO_A_RANDOM_STRING
ENVEOF

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Edit secrets:  nano /opt/raven/.env"
echo "  2. Build & start: cd /opt/raven && docker compose up -d --build"
echo "  3. Check status:  docker compose ps"
echo "  4. View logs:     docker compose logs -f"
echo ""
