# SpecGen v2 Deployment Guide

## Overview
This guide helps you deploy the unified SpecGen v2 application to EC2 with SSL support for the subdomain `v2.futuresofhope.org`.

## Prerequisites
1. **EC2 Instance**: Ubuntu 20.04+ with Node.js 18+, nginx, and certbot installed
2. **Domain Configuration**: DNS records for `v2.futuresofhope.org` pointing to your EC2 IP
3. **SSH Access**: `debanshu.pem` certificate file (already copied to project)
4. **OpenAI API Key**: Required for AI functionality

## Quick Deployment

### Step 1: Set Environment Variables (Optional)
```bash
export EC2_HOST="ubuntu@your-ec2-instance.amazonaws.com"
export OPENAI_API_KEY="your-openai-api-key"
```

### Step 2: Run Deployment Script
```bash
./deploy-ec2.sh
```

The script will:
- Prompt for EC2 host if not set via environment
- Clone/update the repository on EC2
- Build the React application
- Configure nginx with SSL
- Start the application with PM2

## Manual Deployment Steps

### 1. Prepare EC2 Instance
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install nginx and certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Clone and Build Application
```bash
cd /home/ubuntu
git clone https://github.com/gv-sh/sg2.git
cd sg2
npm install
NODE_ENV=production REACT_APP_API_URL=https://v2.futuresofhope.org npm run build
```

### 3. Configure Environment
```bash
# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=8000
HOST=0.0.0.0
API_BASE_URL=https://v2.futuresofhope.org
ALLOWED_ORIGINS=https://v2.futuresofhope.org,https://www.v2.futuresofhope.org
OPENAI_API_KEY=your-openai-api-key-here
EOF
```

### 4. Configure nginx
```bash
# Copy nginx configuration
sudo cp nginx.conf.template /etc/nginx/sites-available/v2.futuresofhope.org
sudo ln -s /etc/nginx/sites-available/v2.futuresofhope.org /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Obtain SSL Certificate
```bash
sudo certbot --nginx -d v2.futuresofhope.org -d www.v2.futuresofhope.org --non-interactive --agree-tos --email admin@futuresofhope.org
```

### 6. Start Application
```bash
pm2 start src/server/server.ts --name sg2 --interpreter tsx
pm2 save
pm2 startup
```

## DNS Configuration

### For v2.futuresofhope.org subdomain:

1. **A Record**: Point `v2.futuresofhope.org` to your EC2 public IP
2. **CNAME Record**: Point `www.v2.futuresofhope.org` to `v2.futuresofhope.org`

#### Example DNS Records:
```
Type: A
Name: v2.futuresofhope.org
Value: 54.123.456.789 (your EC2 public IP)
TTL: 3600

Type: CNAME  
Name: www.v2.futuresofhope.org
Value: v2.futuresofhope.org
TTL: 3600
```

#### If using Route 53:
```bash
# Create hosted zone for subdomain (if not exists)
aws route53 create-hosted-zone --name v2.futuresofhope.org --caller-reference $(date +%s)

# Add A record
aws route53 change-resource-record-sets --hosted-zone-id YOUR_ZONE_ID --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "v2.futuresofhope.org",
      "Type": "A",
      "TTL": 300,
      "ResourceRecords": [{"Value": "YOUR_EC2_IP"}]
    }
  }]
}'
```

## Application Architecture

### Single Port Configuration
- **Application**: Runs on port 8000
- **nginx**: Proxies HTTPS (443) to localhost:8000  
- **SSL**: Let's Encrypt certificates via certbot

### Key Differences from Previous Multi-Service Setup:
- **Unified App**: Single Node.js process instead of separate admin/user/server
- **Single Port**: Port 8000 only (vs. multiple ports previously)
- **Simplified Build**: One `npm run build` command
- **Single Domain**: v2.futuresofhope.org subdomain

## Monitoring and Maintenance

### Check Application Status
```bash
pm2 status
pm2 logs sg2
curl https://v2.futuresofhope.org/api/health
```

### SSL Certificate Renewal
Automatic renewal is configured via cron. Manual renewal:
```bash
sudo certbot renew --nginx
```

### Update Application
```bash
cd /home/ubuntu/sg2
git pull origin main
npm run build
pm2 restart sg2
```

## Security Considerations

1. **Firewall**: Only allow ports 22 (SSH), 80 (HTTP), and 443 (HTTPS)
2. **SSL**: HTTPS enforced via nginx redirect
3. **Rate Limiting**: Configured in nginx for API endpoints
4. **Environment Variables**: Sensitive data stored in .env (not committed)
5. **CORS**: Restricted to allowed origins only

## Troubleshooting

### Common Issues:

1. **DNS Not Resolving**: Wait for DNS propagation (up to 48 hours)
2. **SSL Certificate Failed**: Ensure DNS points to EC2 before running certbot
3. **Application Not Starting**: Check logs with `pm2 logs sg2`
4. **502 Bad Gateway**: Application not running on port 8000

### Useful Commands:
```bash
# Check nginx status
sudo systemctl status nginx
sudo nginx -t

# Check application
pm2 status
pm2 logs sg2 --lines 50

# Check SSL certificate
sudo certbot certificates

# Check firewall
sudo ufw status
```

## Performance Optimization

### For production use:
1. **Enable gzip**: Already configured in nginx template
2. **Static assets caching**: Configured for 1 year
3. **PM2 clustering**: Consider `pm2 start ecosystem.config.js` for clustering
4. **Database optimization**: Consider migrating to managed database for scale
5. **CDN**: Consider CloudFront for static assets

## Quick Updates

### Using the Update Script (Recommended)
For quick updates that preserve your database and environment:

```bash
# Quick update (will prompt for EC2 host)
./update-app.sh

# Update with environment variables
EC2_HOST="ubuntu@your-ec2-instance.amazonaws.com" ./update-app.sh
```

**What the update script does:**
- ✅ **Database Protection**: Creates timestamped backup before update
- ✅ **Environment Sync**: Copies your local `.env` to server with production settings
- ✅ **Smart Updates**: Only reinstalls dependencies if `package.json` changed
- ✅ **Health Checks**: Verifies app is working after update
- ✅ **Rollback**: Automatically reverts if update fails
- ✅ **Zero Downtime**: Uses PM2 graceful restart

### Manual Update Process
```bash
# SSH into your EC2 instance
ssh -i debanshu.pem ubuntu@your-ec2-instance.amazonaws.com

cd /home/ubuntu/sg2

# Create backup first
./backup-database.sh backup

# Update code
git stash  # Preserve any local changes
git pull origin main

# Update dependencies (only if package.json changed)
npm install

# Rebuild application
npm run build

# Restart application
pm2 restart sg2
```

## Database Management

### Database Backup Utility
Use the `backup-database.sh` script for comprehensive database management:

```bash
# Create a backup
./backup-database.sh backup

# List all backups
./backup-database.sh list

# Download latest backup to local machine
./backup-database.sh download

# Restore from specific backup (⚠️ USE WITH CAUTION)
./backup-database.sh restore --backup-name specgen_backup_20241208_143021.db

# Clean up old backups (keeps last 10)
./backup-database.sh cleanup

# Work with local database instead of remote
./backup-database.sh backup --local
```

### Database Location
- **Remote**: `/home/ubuntu/sg2/data/specgen.db`
- **Local**: `./data/specgen.db`
- **Backups**: `/home/ubuntu/backups/` (remote) or `./backups/` (local)

### Automatic Backup Strategy
- **Update Script**: Creates backup before every update
- **Retention**: Keeps last 10 backups automatically
- **Naming**: `specgen_backup_YYYYMMDD_HHMMSS.db`

## Environment Configuration

### Local `.env` Sync
The update script automatically syncs your local `.env` file to the server with these production adjustments:
- `NODE_ENV=development` → `NODE_ENV=production`
- `PORT=3000` → `PORT=8000`
- `HOST=localhost` → `HOST=0.0.0.0`
- Adds production URLs for API endpoints

### Production Environment Variables
```bash
NODE_ENV=production
PORT=8000
HOST=0.0.0.0
API_BASE_URL=https://v2.futuresofhope.org
ALLOWED_ORIGINS=https://v2.futuresofhope.org,https://www.v2.futuresofhope.org
OPENAI_API_KEY=your-api-key-here
# ... other settings from your local .env
```

---

## Support

For issues with deployment, check:
1. EC2 instance logs: `sudo journalctl -u nginx -f`
2. Application logs: `pm2 logs sg2`
3. nginx error log: `sudo tail -f /var/log/nginx/error.log`

### Update Script Troubleshooting
```bash
# Check if update script can connect
./update-app.sh

# Manual health check
curl https://v2.futuresofhope.org/api/health

# View recent application logs
ssh -i debanshu.pem ubuntu@your-ec2-instance.amazonaws.com "pm2 logs sg2 --lines 20"
```