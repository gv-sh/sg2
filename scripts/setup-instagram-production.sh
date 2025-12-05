#!/bin/bash

# Instagram Service Production Setup Script
# This script sets up the production environment for the Instagram integration

set -e

echo "🚀 Setting up Instagram Service for Production..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ Do not run this script as root"
   exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install system dependencies
install_system_deps() {
    echo "📦 Installing system dependencies..."
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command_exists apt-get; then
            # Debian/Ubuntu
            sudo apt-get update
            sudo apt-get install -y \
                chromium-browser \
                fonts-liberation \
                libappindicator3-1 \
                libasound2 \
                libatk-bridge2.0-0 \
                libdrm2 \
                libgtk-3-0 \
                libnspr4 \
                libnss3 \
                libx11-xcb1 \
                libxcomposite1 \
                libxdamage1 \
                libxrandr2 \
                xdg-utils \
                libxss1 \
                libgconf-2-4
        elif command_exists yum; then
            # RHEL/CentOS
            sudo yum install -y \
                chromium \
                liberation-fonts \
                libappindicator-gtk3 \
                libdrm \
                libXScrnSaver \
                libXrandr \
                alsa-lib \
                atk \
                gtk3 \
                ipa-gothic-fonts \
                xorg-x11-fonts-100dpi \
                xorg-x11-fonts-75dpi \
                xorg-x11-utils \
                xorg-x11-fonts-cyrillic \
                xorg-x11-fonts-Type1 \
                xorg-x11-fonts-misc
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "ℹ️  On macOS, Puppeteer will download Chromium automatically"
    else
        echo "⚠️  Unsupported operating system: $OSTYPE"
        echo "Please install Chromium/Chrome manually"
    fi
}

# Function to create cache directories
create_cache_dirs() {
    echo "📁 Creating cache directories..."
    
    # Default production cache directory
    CACHE_DIR=${INSTAGRAM_DISK_CACHE_DIR:-"/var/cache/instagram-images"}
    
    if [[ -w "/var/cache" ]]; then
        sudo mkdir -p "$CACHE_DIR"
        sudo chown "$USER:$USER" "$CACHE_DIR"
        sudo chmod 755 "$CACHE_DIR"
        echo "✅ Created cache directory: $CACHE_DIR"
    else
        # Fall back to user directory
        CACHE_DIR="$HOME/.cache/instagram-images"
        mkdir -p "$CACHE_DIR"
        echo "✅ Created cache directory: $CACHE_DIR"
    fi
    
    export INSTAGRAM_DISK_CACHE_DIR="$CACHE_DIR"
}

# Function to validate environment variables
validate_env() {
    echo "🔍 Validating environment configuration..."
    
    local missing_vars=()
    
    if [[ -z "$INSTAGRAM_ACCESS_TOKEN" ]]; then
        missing_vars+=("INSTAGRAM_ACCESS_TOKEN")
    fi
    
    if [[ -z "$INSTAGRAM_APP_ID" ]]; then
        missing_vars+=("INSTAGRAM_APP_ID")
    fi
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        echo "❌ Missing required environment variables:"
        printf '   %s\n' "${missing_vars[@]}"
        echo ""
        echo "Please set these variables and run the script again:"
        echo "export INSTAGRAM_ACCESS_TOKEN='your_token_here'"
        echo "export INSTAGRAM_APP_ID='your_app_id_here'"
        exit 1
    fi
    
    echo "✅ Environment variables validated"
}

# Function to test Puppeteer installation
test_puppeteer() {
    echo "🧪 Testing Puppeteer installation..."
    
    cat > /tmp/puppeteer_test.js << 'EOF'
const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setContent('<h1>Test</h1>');
    const screenshot = await page.screenshot({ type: 'png' });
    await browser.close();
    
    if (screenshot.length > 0) {
      console.log('✅ Puppeteer test successful');
      process.exit(0);
    } else {
      console.log('❌ Puppeteer test failed: empty screenshot');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Puppeteer test failed:', error.message);
    process.exit(1);
  }
})();
EOF

    if command_exists node; then
        node /tmp/puppeteer_test.js
        rm -f /tmp/puppeteer_test.js
    else
        echo "⚠️  Node.js not found, skipping Puppeteer test"
    fi
}

# Function to set production environment variables
set_production_env() {
    echo "🔧 Configuring production environment..."
    
    # Create environment file if it doesn't exist
    if [[ ! -f ".env.production" ]]; then
        cat > .env.production << EOF
# Instagram Service Production Configuration

# Core Instagram API settings
INSTAGRAM_ACCESS_TOKEN=${INSTAGRAM_ACCESS_TOKEN}
INSTAGRAM_APP_ID=${INSTAGRAM_APP_ID}
INSTAGRAM_API_TIMEOUT=30000
INSTAGRAM_RETRY_ATTEMPTS=3
INSTAGRAM_RETRY_DELAY=1000

# Browser settings
INSTAGRAM_MAX_BROWSER_PAGES=5
INSTAGRAM_PAGE_TIMEOUT=30000
INSTAGRAM_BROWSER_TIMEOUT=60000
INSTAGRAM_BROWSER_RETRY_ATTEMPTS=3
INSTAGRAM_BROWSER_HEADLESS=new
INSTAGRAM_BROWSER_EXECUTABLE=/usr/bin/chromium-browser

# Image generation settings
INSTAGRAM_IMAGE_WIDTH=1080
INSTAGRAM_IMAGE_HEIGHT=1080
INSTAGRAM_IMAGE_QUALITY=95
INSTAGRAM_IMAGE_FORMAT=png
INSTAGRAM_DEVICE_SCALE_FACTOR=2
INSTAGRAM_IMAGE_GENERATION_TIMEOUT=30000
INSTAGRAM_MAX_CONCURRENT_IMAGES=3

# Cache settings
INSTAGRAM_CACHE_MAX_SIZE=100
INSTAGRAM_CACHE_MAX_AGE=3600000
INSTAGRAM_ENABLE_DISK_CACHE=true
INSTAGRAM_DISK_CACHE_DIR=${INSTAGRAM_DISK_CACHE_DIR:-/var/cache/instagram-images}
INSTAGRAM_CACHE_CLEANUP_INTERVAL=600000

# Monitoring settings
INSTAGRAM_ENABLE_METRICS=true
INSTAGRAM_ERROR_HISTORY_SIZE=100
INSTAGRAM_HEALTH_CHECK_INTERVAL=60000
INSTAGRAM_PERFORMANCE_MONITORING=true

# Rate limiting
INSTAGRAM_RATE_LIMITING=true
INSTAGRAM_RATE_LIMIT_WINDOW=900000
INSTAGRAM_RATE_LIMIT_MAX=50
INSTAGRAM_RATE_LIMIT_SKIP_SUCCESS=false

# Node.js settings
NODE_ENV=production
EOF
        echo "✅ Created .env.production file"
    else
        echo "ℹ️  .env.production file already exists"
    fi
}

# Function to create systemd service file
create_systemd_service() {
    echo "🔧 Creating systemd service file..."
    
    local service_file="/tmp/instagram-service.service"
    local install_path="/etc/systemd/system/instagram-service.service"
    
    cat > "$service_file" << EOF
[Unit]
Description=Instagram Service for Story Generation
After=network.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
EnvironmentFile=$(pwd)/.env.production
ExecStart=$(which node) src/server/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=instagram-service

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectHome=yes
ProtectSystem=strict
ReadWritePaths=$(pwd) ${INSTAGRAM_DISK_CACHE_DIR:-/var/cache/instagram-images}

# Resource limits
LimitNOFILE=65536
MemoryLimit=1G

[Install]
WantedBy=multi-user.target
EOF

    echo "Service file created at: $service_file"
    echo "To install the service:"
    echo "  sudo cp $service_file $install_path"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable instagram-service"
    echo "  sudo systemctl start instagram-service"
}

# Function to create monitoring scripts
create_monitoring() {
    echo "📊 Creating monitoring scripts..."
    
    mkdir -p scripts/monitoring
    
    # Health check script
    cat > scripts/monitoring/health-check.sh << 'EOF'
#!/bin/bash

# Instagram Service Health Check Script

HEALTH_URL=${HEALTH_URL:-"http://localhost:3001/api/instagram/health"}
MAX_RETRIES=${MAX_RETRIES:-3}
RETRY_DELAY=${RETRY_DELAY:-5}

for i in $(seq 1 $MAX_RETRIES); do
    echo "Health check attempt $i/$MAX_RETRIES..."
    
    if response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$HEALTH_URL" 2>/dev/null); then
        http_code="${response: -3}"
        
        if [[ "$http_code" == "200" ]]; then
            echo "✅ Service is healthy"
            cat /tmp/health_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/health_response.json
            exit 0
        else
            echo "⚠️  Service returned HTTP $http_code"
            cat /tmp/health_response.json 2>/dev/null || echo "No response body"
        fi
    else
        echo "❌ Failed to connect to service"
    fi
    
    if [[ $i -lt $MAX_RETRIES ]]; then
        echo "Retrying in $RETRY_DELAY seconds..."
        sleep $RETRY_DELAY
    fi
done

echo "❌ Health check failed after $MAX_RETRIES attempts"
exit 1
EOF

    chmod +x scripts/monitoring/health-check.sh
    
    # Cache cleanup script
    cat > scripts/monitoring/cleanup-cache.sh << 'EOF'
#!/bin/bash

# Instagram Service Cache Cleanup Script

CLEANUP_URL=${CLEANUP_URL:-"http://localhost:3001/api/instagram/cache/cleanup"}

echo "Starting cache cleanup..."

if response=$(curl -s -X POST "$CLEANUP_URL"); then
    echo "✅ Cache cleanup completed"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo "❌ Cache cleanup failed"
    exit 1
fi
EOF

    chmod +x scripts/monitoring/cleanup-cache.sh
    
    echo "✅ Monitoring scripts created in scripts/monitoring/"
}

# Function to run performance optimization
optimize_performance() {
    echo "⚡ Applying performance optimizations..."
    
    # Check if we have permission to modify system settings
    if [[ -w "/etc/security/limits.conf" ]]; then
        # Increase file descriptor limits for better performance
        echo "# Instagram Service limits" | sudo tee -a /etc/security/limits.conf
        echo "$USER soft nofile 65536" | sudo tee -a /etc/security/limits.conf
        echo "$USER hard nofile 65536" | sudo tee -a /etc/security/limits.conf
        echo "✅ File descriptor limits increased"
    fi
    
    # Set NODE_OPTIONS for production
    export NODE_OPTIONS="--max-old-space-size=1024 --max-semi-space-size=64"
    echo "✅ Node.js memory settings optimized"
}

# Main execution
main() {
    echo "🎯 Starting Instagram Service Production Setup"
    echo "=============================================="
    
    # Validate environment first
    validate_env
    
    # Install system dependencies
    install_system_deps
    
    # Create cache directories
    create_cache_dirs
    
    # Set production environment
    set_production_env
    
    # Test Puppeteer
    test_puppeteer
    
    # Create monitoring tools
    create_monitoring
    
    # Create systemd service
    create_systemd_service
    
    # Apply performance optimizations
    optimize_performance
    
    echo ""
    echo "✅ Instagram Service Production Setup Complete!"
    echo "=============================================="
    echo ""
    echo "Next steps:"
    echo "1. Review the generated .env.production file"
    echo "2. Install and enable the systemd service (see instructions above)"
    echo "3. Run health checks: ./scripts/monitoring/health-check.sh"
    echo "4. Set up periodic cache cleanup: ./scripts/monitoring/cleanup-cache.sh"
    echo ""
    echo "🚀 Your Instagram service is ready for production!"
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi