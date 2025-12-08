#!/bin/bash

# SpecGen v2 EC2 Remote Deployment Script
# Adapted for unified single-port application
# Run from your Mac to deploy to EC2

set -e

# Configuration - can be overridden with environment variables
EC2_HOST="${EC2_HOST:-}"
EC2_KEY="${EC2_KEY:-./debanshu.pem}"
REPO_URL="${REPO_URL:-https://github.com/gv-sh/sg2.git}"
APP_DIR="${APP_DIR:-/home/ubuntu/sg2}"
DOMAIN_NAME="v2.futuresofhope.org"

# Prompt for EC2 host if not set
if [ -z "$EC2_HOST" ]; then
    echo "🔑 Enter your EC2 SSH connection string:"
    echo "   (e.g., ubuntu@ec2-xx-xx-xx-xx.region.compute.amazonaws.com)"
    read -p "EC2 Host: " EC2_HOST

    if [ -z "$EC2_HOST" ]; then
        echo "❌ EC2 host is required!"
        exit 1
    fi
fi

# Check if key file exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ SSH key file '$EC2_KEY' not found!"
    echo "Please ensure the key file is in the current directory."
    exit 1
fi

echo "🚀 SpecGen v2 EC2 Remote Deployment Starting..."
echo "📡 Target: $EC2_HOST"
echo "🌐 Domain: $DOMAIN_NAME"

# Function to run commands on EC2
run_on_ec2() {
    ssh -i "$EC2_KEY" "$EC2_HOST" "$1"
}

echo "🧹 Stopping existing services..."
run_on_ec2 "
    cd '$APP_DIR' 2>/dev/null || true
    npx pm2 stop sg2 2>/dev/null || true
    npx pm2 delete sg2 2>/dev/null || true
"

echo "📥 Updating repository..."
run_on_ec2 "
    if [ -d '$APP_DIR' ]; then
        cd '$APP_DIR' && git stash && git pull origin main
    else
        git clone '$REPO_URL' '$APP_DIR'
    fi
"

echo "📦 Installing dependencies..."
run_on_ec2 "
    cd '$APP_DIR'
    npm install
"

echo "🏗️ Building application..."
run_on_ec2 "
    cd '$APP_DIR'
    
    # Set production environment for build
    export NODE_ENV=production
    export REACT_APP_API_URL=https://$DOMAIN_NAME
    
    # Build the unified React application
    echo 'Building React application...'
    npm run build
    
    echo '✅ Build completed'
"

echo "🔧 Configuring environment..."

# Get OpenAI API key from local environment
OPENAI_KEY=""
if [ -f "../specgen/specgen-server/.env" ]; then
    OPENAI_KEY=$(grep "OPENAI_API_KEY=" ../specgen/specgen-server/.env | cut -d'=' -f2- | tr -d '"'"'"'')
    echo "✅ Found OpenAI API key in specgen-server/.env"
elif [ -f ".env" ]; then
    OPENAI_KEY=$(grep "OPENAI_API_KEY=" .env | cut -d'=' -f2- | tr -d '"'"'"'')
    echo "✅ Found OpenAI API key in local .env"
else
    echo "⚠️  No OpenAI API key found locally, please enter it:"
    read -p "OpenAI API Key: " OPENAI_KEY
    if [ -z "$OPENAI_KEY" ]; then
        echo "❌ OpenAI API key is required!"
        exit 1
    fi
fi

run_on_ec2 "
    cd '$APP_DIR'
    
    # Create logs directory
    mkdir -p logs
    
    # Configure server environment
    cat > .env << 'EOF'
NODE_ENV=production
PORT=8000
HOST=0.0.0.0
API_BASE_URL=https://$DOMAIN_NAME
ALLOWED_ORIGINS=https://$DOMAIN_NAME,https://www.$DOMAIN_NAME
EOF
    
    # Add OpenAI key securely
    echo 'OPENAI_API_KEY=$OPENAI_KEY' >> .env
    
    echo 'Environment configured'
"

echo "🌐 Setting up nginx and SSL..."
run_on_ec2 "
    # Install nginx and certbot if not present
    if ! command -v nginx &> /dev/null; then
        echo 'Installing nginx and certbot...'
        sudo apt update
        sudo apt install -y nginx certbot python3-certbot-nginx
    fi
    
    # Create initial nginx configuration for $DOMAIN_NAME (HTTP only for certbot)
    NGINX_CONF=\"/etc/nginx/sites-available/$DOMAIN_NAME\"
    if [ ! -f \"\$NGINX_CONF\" ]; then
        echo 'Creating initial nginx configuration...'
        sudo tee \"\$NGINX_CONF\" > /dev/null << 'NGINXEOF'
# Nginx configuration for $DOMAIN_NAME
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_buffers 16 4k;
        proxy_buffer_size 2k;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF
        
        # Enable the site
        sudo ln -sf \"\$NGINX_CONF\" /etc/nginx/sites-enabled/
        
        # Create web root for certbot
        sudo mkdir -p /var/www/html
        
        # Test and reload nginx
        sudo nginx -t && sudo systemctl enable nginx && sudo systemctl reload nginx
        echo 'Initial nginx configuration created'
    else
        echo 'Nginx configuration already exists'
    fi
    
    # Obtain SSL certificate
    echo 'Setting up SSL certificate...'
    if [ ! -f /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem ]; then
        echo 'Obtaining SSL certificate from Let'\''s Encrypt...'
        sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --non-interactive --agree-tos --email admin@futuresofhope.org --redirect
        echo 'SSL certificate obtained and nginx configured for HTTPS'
    else
        echo 'SSL certificate already exists'
    fi
    
    # Setup auto-renewal
    echo 'Setting up SSL certificate auto-renewal...'
    (sudo crontab -l 2>/dev/null || true; echo '0 12 * * * /usr/bin/certbot renew --quiet') | sudo crontab -
    
    echo 'SSL setup completed'
"

echo "🚀 Starting application..."
run_on_ec2 "
    cd '$APP_DIR'
    
    # Start with PM2
    npx pm2 start src/server/server.ts --name sg2 --interpreter tsx
"

echo "⏳ Waiting for startup..."
sleep 5

echo "🧪 Testing deployment..."
HEALTH_CHECK=$(run_on_ec2 "curl -s http://localhost:8000/api/health | jq -r '.status' 2>/dev/null || echo 'failed'")

if [ "$HEALTH_CHECK" = "healthy" ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Access your application:"
    echo "  Application: https://$DOMAIN_NAME/"
    echo "  API Documentation: https://$DOMAIN_NAME/api-docs"
    echo "  Health Check: https://$DOMAIN_NAME/api/health"
    echo ""
    echo "🔒 SSL Certificate:"
    echo "  - HTTPS enabled and configured"
    echo "  - Auto-renewal set up via cron"
    echo "  - HTTP requests redirect to HTTPS"
    echo ""
    echo "📊 Server status:"
    run_on_ec2 "cd '$APP_DIR' && npx pm2 status"
else
    echo "❌ Deployment failed - health check returned: $HEALTH_CHECK"
    echo "📋 Checking logs..."
    run_on_ec2 "cd '$APP_DIR' && npx pm2 logs sg2 --lines 10"
    exit 1
fi

echo "🎉 SpecGen v2 deployment completed successfully!"
echo ""
echo "📝 DNS Configuration:"
echo "  You need to configure DNS for $DOMAIN_NAME to point to your EC2 instance:"
echo "  - Create an A record for $DOMAIN_NAME pointing to your EC2 public IP"
echo "  - Create a CNAME record for www.$DOMAIN_NAME pointing to $DOMAIN_NAME"
echo "  - If using Route 53, you can create an alias record instead"