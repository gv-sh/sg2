#!/bin/bash

# SpecGen v2 Quick Update Script
# Safely update the application while preserving database and environment

set -e

# Configuration
EC2_HOST="${EC2_HOST:-}"
EC2_KEY="${EC2_KEY:-./debanshu.pem}"
APP_DIR="${APP_DIR:-/home/ubuntu/sg2}"
DOMAIN_NAME="futuresofhope.org"
BACKUP_DIR="/home/ubuntu/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run       Show what would be executed without making changes"
            echo "  --help, -h      Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --dry-run    # Test update without changes"
            echo "  $0              # Update application"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}🧪 SpecGen v2 Quick Update [DRY RUN]${NC}"
    echo -e "${YELLOW}This is a dry run - no changes will be made${NC}"
else
    echo -e "${BLUE}🔄 SpecGen v2 Quick Update Starting...${NC}"
fi

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
    exit 1
fi

# Check if local .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Local .env file not found. Environment will not be synced.${NC}"
    SYNC_ENV=false
else
    SYNC_ENV=true
    echo -e "${GREEN}✅ Local .env file found and will be synced${NC}"
fi

echo -e "${BLUE}📡 Target: $EC2_HOST${NC}"
echo -e "${BLUE}🌐 Domain: $DOMAIN_NAME${NC}"

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

# Function to copy files to EC2 (with dry-run support)
copy_to_ec2() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}[DRY RUN] Would copy file to EC2:${NC}"
        echo -e "${YELLOW}  scp -i \"$EC2_KEY\" \"$1\" \"$EC2_HOST:$2\"${NC}"
        return 0
    else
        scp -i "$EC2_KEY" "$1" "$EC2_HOST:$2"
    fi
}

echo -e "${YELLOW}🔍 Checking current application status...${NC}"
CURRENT_STATUS=$(run_on_ec2 "cd '$APP_DIR' && npx pm2 jlist | jq -r '.[] | select(.name==\"sg2\") | .pm2_env.status' 2>/dev/null || echo 'stopped'")
echo -e "${BLUE}Current status: $CURRENT_STATUS${NC}"

echo -e "${YELLOW}💾 Creating database backup...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
run_on_ec2 "
    # Create backup directory if it doesn't exist
    mkdir -p '$BACKUP_DIR'
    
    # Create database backup
    if [ -f '$APP_DIR/data/specgen.db' ]; then
        cp '$APP_DIR/data/specgen.db' '$BACKUP_DIR/specgen_backup_$TIMESTAMP.db'
        echo 'Database backed up to: $BACKUP_DIR/specgen_backup_$TIMESTAMP.db'
    else
        echo 'No database found to backup (this is normal for first deployment)'
    fi
    
    # Keep only last 10 backups
    cd '$BACKUP_DIR' && ls -t specgen_backup_*.db 2>/dev/null | tail -n +11 | xargs rm -f || true
"

if [ "$SYNC_ENV" = true ]; then
    echo -e "${YELLOW}🔧 Syncing local .env file...${NC}"
    
    # Create a temporary production .env file locally
    TEMP_ENV=$(mktemp)
    
    # Copy local .env and modify for production
    cp .env "$TEMP_ENV"
    
    # Update production-specific values
    sed -i.bak 's/NODE_ENV=development/NODE_ENV=production/' "$TEMP_ENV"
    sed -i.bak 's/PORT=3000/PORT=8000/' "$TEMP_ENV"
    sed -i.bak 's/HOST=localhost/HOST=0.0.0.0/' "$TEMP_ENV"
    
    # Add production-specific environment variables if not present
    if ! grep -q "API_BASE_URL" "$TEMP_ENV"; then
        echo "API_BASE_URL=https://$DOMAIN_NAME" >> "$TEMP_ENV"
    fi
    if ! grep -q "ALLOWED_ORIGINS" "$TEMP_ENV"; then
        echo "ALLOWED_ORIGINS=https://$DOMAIN_NAME,https://www.$DOMAIN_NAME" >> "$TEMP_ENV"
    fi
    
    # Copy the updated .env to server
    copy_to_ec2 "$TEMP_ENV" "$APP_DIR/.env"
    
    # Clean up temporary file
    rm "$TEMP_ENV" "$TEMP_ENV.bak"
    
    echo -e "${GREEN}✅ Environment synced${NC}"
fi

echo -e "${YELLOW}📥 Updating application code...${NC}"
run_on_ec2 "
    cd '$APP_DIR'
    
    # Stash any local changes (like uploaded images)
    git stash push -m 'Auto-stash before update $TIMESTAMP' || true
    
    # Pull latest changes
    git fetch origin main
    git reset --hard origin/main
    
    # Check if package.json changed
    PACKAGE_CHANGED=\$(git diff HEAD~1 HEAD --name-only | grep package.json || echo '')
    
    if [ -n \"\$PACKAGE_CHANGED\" ]; then
        echo 'Package.json changed, running npm install...'
        npm install
    else
        echo 'Package.json unchanged, skipping npm install'
    fi
"

echo -e "${YELLOW}🏗️  Building application...${NC}"
run_on_ec2 "
    cd '$APP_DIR'
    
    # Set production environment for build
    export NODE_ENV=production
    export REACT_APP_API_URL=https://$DOMAIN_NAME
    
    # Build the application
    npm run build
"

echo -e "${YELLOW}♻️  Restarting application...${NC}"
run_on_ec2 "
    cd '$APP_DIR'
    
    # Graceful restart with PM2 using ecosystem file
    if npx pm2 describe sg2 > /dev/null 2>&1; then
        npx pm2 restart sg2
    else
        # Start if not running using ecosystem file for proper env loading
        npx pm2 start ecosystem.config.cjs
    fi
"

echo -e "${YELLOW}⏳ Waiting for application startup...${NC}"
if [ "$DRY_RUN" = false ]; then
    sleep 8
fi

echo -e "${YELLOW}🧪 Testing application health...${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}[DRY RUN] Would perform health checks:${NC}"
    echo -e "${YELLOW}  1. Wait for application startup${NC}"
    echo -e "${YELLOW}  2. Check health endpoint 6 times with 5s intervals${NC}"
    echo -e "${YELLOW}  3. Rollback if health checks fail${NC}"
    echo -e "${GREEN}✅ Dry run health check simulation completed${NC}"
    HEALTH_STATUS="healthy"  # Simulate success for dry run
else
    HEALTH_CHECK_ATTEMPTS=0
    MAX_ATTEMPTS=6

    while [ $HEALTH_CHECK_ATTEMPTS -lt $MAX_ATTEMPTS ]; do
        HEALTH_STATUS=$(run_on_ec2 "curl -s http://localhost:8000/api/system/health | jq -r '.data.status' 2>/dev/null || echo 'failed'")
        
        if [ "$HEALTH_STATUS" = "healthy" ]; then
            echo -e "${GREEN}✅ Application is healthy!${NC}"
            break
        else
            echo -e "${YELLOW}⏳ Attempt $((HEALTH_CHECK_ATTEMPTS + 1))/$MAX_ATTEMPTS - Status: $HEALTH_STATUS${NC}"
            sleep 5
            HEALTH_CHECK_ATTEMPTS=$((HEALTH_CHECK_ATTEMPTS + 1))
        fi
    done
fi

if [ "$DRY_RUN" = false ] && [ $HEALTH_CHECK_ATTEMPTS -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ Health check failed! Rolling back...${NC}"
    
    # Restore database backup
    run_on_ec2 "
        if [ -f '$BACKUP_DIR/specgen_backup_$TIMESTAMP.db' ]; then
            cp '$BACKUP_DIR/specgen_backup_$TIMESTAMP.db' '$APP_DIR/data/specgen.db'
            echo 'Database restored from backup'
        fi
        
        cd '$APP_DIR'
        git stash pop || true
        npx pm2 restart sg2 || npx pm2 start ecosystem.config.cjs
    "
    
    echo -e "${RED}❌ Update failed and rolled back. Check logs with: npx pm2 logs sg2${NC}"
    exit 1
fi

# Final status check
echo -e "${BLUE}📊 Final status:${NC}"
run_on_ec2 "cd '$APP_DIR' && npx pm2 status sg2"

# Show recent logs
echo -e "${BLUE}📋 Recent application logs:${NC}"
run_on_ec2 "cd '$APP_DIR' && npx pm2 logs sg2 --lines 5"

echo -e "${GREEN}🎉 Update completed successfully!${NC}"
echo -e "${GREEN}🌐 Application available at: https://$DOMAIN_NAME${NC}"
echo -e "${BLUE}📁 Database backup saved as: specgen_backup_$TIMESTAMP.db${NC}"

# Optional: Test external connectivity
echo -e "${YELLOW}🔗 Testing external connectivity...${NC}"
EXTERNAL_CHECK=$(curl -s "https://$DOMAIN_NAME/api/system/health" | jq -r '.data.status' 2>/dev/null || echo 'failed')
if [ "$EXTERNAL_CHECK" = "healthy" ]; then
    echo -e "${GREEN}✅ External connectivity confirmed!${NC}"
else
    echo -e "${YELLOW}⚠️  External connectivity test failed (this might be normal if DNS is still propagating)${NC}"
fi