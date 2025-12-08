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

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
DRY_RUN=false
RESTORE_ENV=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --restore-env)
            RESTORE_ENV=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run       Show what would be executed without making changes"
            echo "  --restore-env   Restore original environment after deployment"
            echo "  --help, -h      Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --dry-run                    # Test deployment without changes"
            echo "  $0                              # Deploy to production"
            echo "  $0 --restore-env               # Deploy and restore dev environment"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Environment switching functions (embedded from switch-env.sh)
BACKUP_DIR=".backups"
ENV_FILE=".env"

get_current_env_mode() {
    if [ -f "$ENV_FILE" ]; then
        CURRENT_MODE=$(grep "^DEPLOYMENT_MODE=" "$ENV_FILE" | cut -d'=' -f2)
        CURRENT_BASE_URL=$(grep "^BASE_URL=" "$ENV_FILE" | cut -d'=' -f2)
        PRODUCTION_URL=$(grep "^PRODUCTION_URL=" "$ENV_FILE" | cut -d'=' -f2)
    else
        CURRENT_MODE="unknown"
        CURRENT_BASE_URL=""
        PRODUCTION_URL=""
    fi
}

backup_env() {
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/.env.backup.$TIMESTAMP"
    cp "$ENV_FILE" "$BACKUP_FILE"
    echo -e "${BLUE}📋 Environment backed up to: $BACKUP_FILE${NC}"
    echo "$BACKUP_FILE" > "$BACKUP_DIR/.last_backup"
}

switch_to_production() {
    if [ -f "$ENV_FILE" ]; then
        get_current_env_mode
        if [ "$CURRENT_MODE" != "production" ]; then
            echo -e "${YELLOW}🔄 Switching to production mode...${NC}"
            backup_env
            
            sed -i.tmp "s|^DEPLOYMENT_MODE=.*|DEPLOYMENT_MODE=production|" "$ENV_FILE"
            sed -i.tmp "s|^BASE_URL=.*|BASE_URL=$PRODUCTION_URL|" "$ENV_FILE"
            sed -i.tmp "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=$PRODUCTION_URL|" "$ENV_FILE"
            rm -f "${ENV_FILE}.tmp"
            
            echo -e "${GREEN}✅ Switched to production mode${NC}"
        else
            echo -e "${GREEN}✅ Already in production mode${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ No .env file found - will create production environment on server${NC}"
    fi
}

restore_env() {
    if [ -f "$BACKUP_DIR/.last_backup" ]; then
        BACKUP_FILE=$(cat "$BACKUP_DIR/.last_backup")
        if [ -f "$BACKUP_FILE" ]; then
            echo -e "${YELLOW}🔄 Restoring original environment...${NC}"
            cp "$BACKUP_FILE" "$ENV_FILE"
            echo -e "${GREEN}✅ Environment restored${NC}"
        fi
    fi
}

# Auto-detect EC2 host from domain
auto_detect_ec2_host() {
    echo -e "${BLUE}🔍 Auto-detecting EC2 host from domain: $DOMAIN_NAME${NC}"
    
    # Get IP address of domain
    DOMAIN_IP=$(dig +short "$DOMAIN_NAME" 2>/dev/null | head -1)
    
    # If subdomain doesn't exist, try parent domain
    if [ -z "$DOMAIN_IP" ]; then
        PARENT_DOMAIN=$(echo "$DOMAIN_NAME" | sed 's/^[^.]*\.//')
        echo -e "${BLUE}🔄 Subdomain not found, trying parent domain: $PARENT_DOMAIN${NC}"
        DOMAIN_IP=$(dig +short "$PARENT_DOMAIN" 2>/dev/null | head -1)
    fi
    
    if [ -z "$DOMAIN_IP" ]; then
        echo -e "${YELLOW}⚠️  Could not resolve domain IP${NC}"
        return 1
    fi
    
    echo -e "${BLUE}📍 Domain IP: $DOMAIN_IP${NC}"
    
    # Reverse DNS lookup to get EC2 hostname
    EC2_HOSTNAME=$(nslookup "$DOMAIN_IP" 2>/dev/null | grep -E "amazonaws\.com" | awk '{print $4}' | sed 's/\.$//' | head -1)
    if [ -z "$EC2_HOSTNAME" ]; then
        echo -e "${YELLOW}⚠️  Could not find EC2 hostname via reverse DNS${NC}"
        return 1
    fi
    
    echo -e "${BLUE}🖥️  Found EC2 hostname: $EC2_HOSTNAME${NC}"
    
    # Format as ubuntu@hostname
    AUTO_DETECTED_HOST="ubuntu@$EC2_HOSTNAME"
    echo -e "${GREEN}✅ Auto-detected EC2 host: $AUTO_DETECTED_HOST${NC}"
    
    return 0
}

# Function to run commands on EC2 (with dry-run support)
run_on_ec2() {
    local command="$1"
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}[DRY RUN] Would execute on EC2:${NC}"
        echo -e "${YELLOW}  ssh -i \"$EC2_KEY\" \"$EC2_HOST\" \"$command\"${NC}"
        return 0
    else
        ssh -i "$EC2_KEY" "$EC2_HOST" "$command"
    fi
}

# Validation and pre-flight checks
validate_deployment() {
    echo -e "${BLUE}🔍 Pre-deployment validation...${NC}"
    
    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ .env file not found!${NC}"
        exit 1
    fi
    
    # Show current environment
    get_current_env_mode
    echo -e "${BLUE}📊 Current environment: $CURRENT_MODE${NC}"
    echo -e "${BLUE}📊 Current URL: $CURRENT_BASE_URL${NC}"
    echo -e "${BLUE}📊 Production URL: $PRODUCTION_URL${NC}"
    
    # Auto-detect or prompt for EC2 host
    if [ -z "$EC2_HOST" ]; then
        if auto_detect_ec2_host; then
            EC2_HOST="$AUTO_DETECTED_HOST"
            echo -e "${GREEN}✅ Using auto-detected host: $EC2_HOST${NC}"
        else
            echo -e "${YELLOW}🔑 Auto-detection failed. Enter your EC2 SSH connection string:${NC}"
            echo "   (e.g., ubuntu@ec2-xx-xx-xx-xx.region.compute.amazonaws.com)"
            read -p "EC2 Host: " EC2_HOST

            if [ -z "$EC2_HOST" ]; then
                echo -e "${RED}❌ EC2 host is required!${NC}"
                exit 1
            fi
        fi
    else
        echo -e "${GREEN}✅ Using provided host: $EC2_HOST${NC}"
    fi

    # Check if key file exists
    if [ ! -f "$EC2_KEY" ]; then
        echo -e "${RED}❌ SSH key file '$EC2_KEY' not found!${NC}"
        echo "Please ensure the key file is in the current directory."
        exit 1
    fi
    
    # Test SSH connectivity
    echo -e "${YELLOW}🔑 Testing SSH connectivity...${NC}"
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}[DRY RUN] Would test SSH connection to: $EC2_HOST${NC}"
    else
        if ! ssh -i "$EC2_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$EC2_HOST" "echo 'SSH connection successful'" > /dev/null 2>&1; then
            echo -e "${RED}❌ SSH connection failed!${NC}"
            echo "Please check your EC2_HOST and key file."
            exit 1
        fi
        echo -e "${GREEN}✅ SSH connection successful${NC}"
    fi
    
    echo -e "${GREEN}✅ Pre-deployment validation passed${NC}"
}

# Main deployment header
show_deployment_header() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}🧪 SpecGen v2 EC2 Deployment [DRY RUN]${NC}"
        echo -e "${YELLOW}This is a dry run - no changes will be made${NC}"
    else
        echo -e "${BLUE}🚀 SpecGen v2 EC2 Remote Deployment Starting...${NC}"
    fi
    echo -e "${BLUE}📡 Target: $EC2_HOST${NC}"
    echo -e "${BLUE}🌐 Domain: $DOMAIN_NAME${NC}"
}

# Run validation
validate_deployment
show_deployment_header

# Switch to production environment
if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}[DRY RUN] Would switch to production environment${NC}"
    get_current_env_mode
    if [ "$CURRENT_MODE" != "production" ]; then
        echo -e "${YELLOW}[DRY RUN] Would switch from $CURRENT_MODE to production mode${NC}"
        echo -e "${YELLOW}[DRY RUN] Would update BASE_URL: $CURRENT_BASE_URL → $PRODUCTION_URL${NC}"
        echo -e "${YELLOW}[DRY RUN] Would update REACT_APP_API_URL: $CURRENT_BASE_URL → $PRODUCTION_URL${NC}"
    fi
else
    switch_to_production
fi

echo -e "${YELLOW}🧹 Stopping existing services...${NC}"
run_on_ec2 "
    cd '$APP_DIR' 2>/dev/null || true
    npx pm2 stop sg2 2>/dev/null || true
    npx pm2 delete sg2 2>/dev/null || true
"

echo -e "${YELLOW}📥 Updating repository...${NC}"
run_on_ec2 "
    if [ -d '$APP_DIR' ]; then
        cd '$APP_DIR' && git stash && git pull origin main
    else
        git clone '$REPO_URL' '$APP_DIR'
    fi
"

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
run_on_ec2 "
    cd '$APP_DIR'
    npm install
"

echo -e "${YELLOW}🏗️ Building application...${NC}"
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

echo -e "${YELLOW}🔧 Configuring environment...${NC}"

# Get credentials from local environment
OPENAI_KEY=""
INSTAGRAM_CONFIG=""
if [ -f "../specgen/specgen-server/.env" ]; then
    OPENAI_KEY=$(grep "OPENAI_API_KEY=" ../specgen/specgen-server/.env | cut -d'=' -f2- | tr -d '"'"'"'')
    echo -e "${GREEN}✅ Found OpenAI API key in specgen-server/.env${NC}"
elif [ -f ".env" ]; then
    OPENAI_KEY=$(grep "OPENAI_API_KEY=" .env | cut -d'=' -f2- | tr -d '"'"'"'')
    echo -e "${GREEN}✅ Found OpenAI API key in local .env${NC}"
else
    echo -e "${YELLOW}⚠️  No OpenAI API key found locally, please enter it:${NC}"
    read -p "OpenAI API Key: " OPENAI_KEY
    if [ -z "$OPENAI_KEY" ]; then
        echo -e "${RED}❌ OpenAI API key is required!${NC}"
        exit 1
    fi
fi

# Extract Instagram configuration if available
if [ -f ".env" ]; then
    FACEBOOK_PAGE_ID=$(grep "FACEBOOK_PAGE_ID=" .env | cut -d'=' -f2- | tr -d '"'"'"'')
    INSTAGRAM_APP_NAME=$(grep "INSTAGRAM_APP_NAME=" .env | cut -d'=' -f2- | tr -d '"'"'"'')
    INSTAGRAM_APP_ID=$(grep "INSTAGRAM_APP_ID=" .env | cut -d'=' -f2- | tr -d '"'"'"'')
    INSTAGRAM_APP_SECRET=$(grep "INSTAGRAM_APP_SECRET=" .env | cut -d'=' -f2- | tr -d '"'"'"'')
    INSTAGRAM_ACCESS_TOKEN=$(grep "INSTAGRAM_ACCESS_TOKEN=" .env | cut -d'=' -f2- | tr -d '"'"'"'')
    
    if [ -n "$FACEBOOK_PAGE_ID" ]; then
        echo -e "${GREEN}✅ Found Instagram configuration in local .env${NC}"
        INSTAGRAM_CONFIG="
FACEBOOK_PAGE_ID=$FACEBOOK_PAGE_ID
INSTAGRAM_APP_NAME=$INSTAGRAM_APP_NAME
INSTAGRAM_APP_ID=$INSTAGRAM_APP_ID
INSTAGRAM_APP_SECRET=$INSTAGRAM_APP_SECRET
INSTAGRAM_ACCESS_TOKEN=$INSTAGRAM_ACCESS_TOKEN"
    else
        echo -e "${YELLOW}⚠️  Instagram configuration not found in .env${NC}"
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
    
    # Add Instagram configuration if available
    if [ -n '$INSTAGRAM_CONFIG' ]; then
        echo '$INSTAGRAM_CONFIG' >> .env
        echo 'Instagram configuration added'
    else
        echo 'No Instagram configuration available'
    fi
    
    echo 'Environment configured'
"

echo -e "${YELLOW}🌐 Setting up nginx and SSL...${NC}"
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
        
        # Enable the v2 site (alongside existing sites, not replacing them)
        sudo ln -sf \"\$NGINX_CONF\" /etc/nginx/sites-enabled/
        
        # NOTE: NOT removing existing sites - this will coexist with futuresofhope.org
        echo 'Added v2 subdomain configuration (existing sites preserved)'
        
        # Create web root for certbot if it doesn't exist
        sudo mkdir -p /var/www/html
        
        # Test and reload nginx (will work alongside existing configuration)
        sudo nginx -t && sudo systemctl enable nginx && sudo systemctl reload nginx
        echo 'v2 subdomain nginx configuration added successfully'
    else
        echo 'v2 subdomain nginx configuration already exists'
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

echo -e "${YELLOW}🚀 Starting application...${NC}"
run_on_ec2 "
    cd '$APP_DIR'
    
    # Start with PM2 using ecosystem file for better environment management
    npx pm2 start ecosystem.config.js
"

echo -e "${YELLOW}⏳ Waiting for startup...${NC}"
if [ "$DRY_RUN" = false ]; then
    sleep 5
fi

echo -e "${YELLOW}🧪 Testing deployment...${NC}"
HEALTH_CHECK=$(run_on_ec2 "curl -s http://localhost:8000/api/system/health | jq -r '.data.status' 2>/dev/null || echo 'failed'")

if [ "$DRY_RUN" = true ] || [ "$HEALTH_CHECK" = "healthy" ]; then
    if [ "$DRY_RUN" = false ]; then
        echo -e "${GREEN}✅ Deployment successful!${NC}"
        echo ""
        echo -e "${BLUE}🌐 Access your application:${NC}"
        echo "  Application: https://$DOMAIN_NAME/"
        echo "  API Documentation: https://$DOMAIN_NAME/api-docs"
        echo "  Health Check: https://$DOMAIN_NAME/api/system/health"
        echo ""
        echo -e "${BLUE}🔒 SSL Certificate:${NC}"
        echo "  - HTTPS enabled and configured"
        echo "  - Auto-renewal set up via cron"
        echo "  - HTTP requests redirect to HTTPS"
        echo ""
        echo -e "${BLUE}📊 Server status:${NC}"
        run_on_ec2 "cd '$APP_DIR' && npx pm2 status"
    fi
else
    echo -e "${RED}❌ Deployment failed - health check returned: $HEALTH_CHECK${NC}"
    echo -e "${YELLOW}📋 Checking logs...${NC}"
    run_on_ec2 "cd '$APP_DIR' && npx pm2 logs sg2 --lines 10"
    exit 1
fi

# Deployment completion
if [ "$DRY_RUN" = true ]; then
    echo -e "${GREEN}🧪 Dry run completed successfully!${NC}"
    echo -e "${BLUE}📋 Summary of what would be executed:${NC}"
    echo -e "${YELLOW}  1. Switch local environment to production mode${NC}"
    echo -e "${YELLOW}  2. Stop existing services on EC2${NC}"
    echo -e "${YELLOW}  3. Update repository on EC2${NC}"
    echo -e "${YELLOW}  4. Install dependencies${NC}"
    echo -e "${YELLOW}  5. Build React application${NC}"
    echo -e "${YELLOW}  6. Configure production environment${NC}"
    echo -e "${YELLOW}  7. Setup nginx and SSL${NC}"
    echo -e "${YELLOW}  8. Start application with PM2${NC}"
    echo -e "${YELLOW}  9. Run health checks${NC}"
    if [ "$RESTORE_ENV" = true ]; then
        echo -e "${YELLOW}  10. Restore original local environment${NC}"
    fi
    echo ""
    echo -e "${BLUE}To execute for real, run: ${NC}$0 ${RESTORE_ENV:+--restore-env}"
else
    echo -e "${GREEN}🎉 SpecGen v2 deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Access your application:${NC}"
    echo "  Application: https://$DOMAIN_NAME/"
    echo "  API Documentation: https://$DOMAIN_NAME/api-docs"
    echo "  Health Check: https://$DOMAIN_NAME/api/system/health"
    
    # Restore environment if requested
    if [ "$RESTORE_ENV" = true ]; then
        restore_env
    fi
    
    echo ""
    echo -e "${BLUE}📝 DNS Configuration:${NC}"
    echo "  You need to configure DNS for $DOMAIN_NAME to point to your EC2 instance:"
    echo "  - Create an A record for $DOMAIN_NAME pointing to your EC2 public IP"
    echo "  - Create a CNAME record for www.$DOMAIN_NAME pointing to $DOMAIN_NAME"
    echo "  - If using Route 53, you can create an alias record instead"
fi