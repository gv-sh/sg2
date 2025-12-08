#!/bin/bash

# SpecGen Environment Switcher
# Automatically switch between development (ngrok) and production URLs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENV_FILE=".env"
BACKUP_DIR=".backups"
BACKUP_FILE="$BACKUP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"

# Function to show usage
usage() {
    echo "Usage: $0 [MODE]"
    echo ""
    echo "Modes:"
    echo "  dev        Switch to development mode (ngrok URLs)"
    echo "  prod       Switch to production mode (v2.futuresofhope.org)"
    echo "  status     Show current configuration"
    echo "  update-ngrok URL   Update ngrok URL and switch to dev mode"
    echo ""
    echo "Examples:"
    echo "  $0 dev                                    # Switch to development"
    echo "  $0 prod                                   # Switch to production"
    echo "  $0 status                                 # Show current mode"
    echo "  $0 update-ngrok https://abcd1234.ngrok-free.app   # Update ngrok URL"
}

# Function to backup .env file
backup_env() {
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    cp "$ENV_FILE" "$BACKUP_FILE"
    echo -e "${BLUE}📋 Created backup: $BACKUP_FILE${NC}"
}

# Function to get current URLs
get_current_urls() {
    if [ -f "$ENV_FILE" ]; then
        CURRENT_BASE_URL=$(grep "^BASE_URL=" "$ENV_FILE" | cut -d'=' -f2)
        CURRENT_REACT_URL=$(grep "^REACT_APP_API_URL=" "$ENV_FILE" | cut -d'=' -f2)
        CURRENT_MODE=$(grep "^DEPLOYMENT_MODE=" "$ENV_FILE" | cut -d'=' -f2)
        NGROK_URL=$(grep "^NGROK_URL=" "$ENV_FILE" | cut -d'=' -f2)
        PRODUCTION_URL=$(grep "^PRODUCTION_URL=" "$ENV_FILE" | cut -d'=' -f2)
    else
        echo -e "${RED}❌ .env file not found!${NC}"
        exit 1
    fi
}

# Function to update URLs in .env
update_urls() {
    local base_url="$1"
    local react_url="$2"
    local mode="$3"
    
    # Update the active URLs
    sed -i.tmp "s|^BASE_URL=.*|BASE_URL=${base_url}|" "$ENV_FILE"
    sed -i.tmp "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=${react_url}|" "$ENV_FILE"
    sed -i.tmp "s|^DEPLOYMENT_MODE=.*|DEPLOYMENT_MODE=${mode}|" "$ENV_FILE"
    
    # Clean up temp file
    rm -f "${ENV_FILE}.tmp"
}

# Function to update commented examples
update_comments() {
    local ngrok_url="$1"
    local prod_url="$2"
    
    # Update commented ngrok URL
    sed -i.tmp "s|# BASE_URL=https://.*ngrok.*|# BASE_URL=${ngrok_url}|" "$ENV_FILE"
    sed -i.tmp "s|# REACT_APP_API_URL=https://.*ngrok.*|# REACT_APP_API_URL=${ngrok_url}|" "$ENV_FILE"
    
    # Clean up temp file
    rm -f "${ENV_FILE}.tmp"
}

# Function to switch to development mode
switch_to_dev() {
    echo -e "${YELLOW}🔄 Switching to development mode (ngrok)...${NC}"
    
    get_current_urls
    backup_env
    
    update_urls "$NGROK_URL" "$NGROK_URL" "development"
    update_comments "$NGROK_URL" "$PRODUCTION_URL"
    
    echo -e "${GREEN}✅ Switched to development mode${NC}"
    echo -e "${BLUE}📡 Using URLs: $NGROK_URL${NC}"
}

# Function to switch to production mode
switch_to_prod() {
    echo -e "${YELLOW}🔄 Switching to production mode...${NC}"
    
    get_current_urls
    backup_env
    
    update_urls "$PRODUCTION_URL" "$PRODUCTION_URL" "production"
    update_comments "$NGROK_URL" "$PRODUCTION_URL"
    
    echo -e "${GREEN}✅ Switched to production mode${NC}"
    echo -e "${BLUE}🌐 Using URLs: $PRODUCTION_URL${NC}"
}

# Function to update ngrok URL
update_ngrok() {
    local new_ngrok_url="$1"
    
    echo -e "${YELLOW}🔄 Updating ngrok URL and switching to development mode...${NC}"
    
    get_current_urls
    backup_env
    
    # Update the stored ngrok URL
    sed -i.tmp "s|^NGROK_URL=.*|NGROK_URL=${new_ngrok_url}|" "$ENV_FILE"
    rm -f "${ENV_FILE}.tmp"
    
    # Switch to development mode with new URL
    update_urls "$new_ngrok_url" "$new_ngrok_url" "development"
    update_comments "$new_ngrok_url" "$PRODUCTION_URL"
    
    echo -e "${GREEN}✅ Updated ngrok URL and switched to development mode${NC}"
    echo -e "${BLUE}📡 New ngrok URL: $new_ngrok_url${NC}"
}

# Function to show current status
show_status() {
    echo -e "${BLUE}📊 Current Environment Configuration:${NC}"
    echo ""
    
    get_current_urls
    
    echo -e "Mode: ${YELLOW}$CURRENT_MODE${NC}"
    echo -e "Active BASE_URL: ${GREEN}$CURRENT_BASE_URL${NC}"
    echo -e "Active REACT_APP_API_URL: ${GREEN}$CURRENT_REACT_URL${NC}"
    echo ""
    echo -e "Available URLs:"
    echo -e "  Development (ngrok): ${BLUE}$NGROK_URL${NC}"
    echo -e "  Production: ${BLUE}$PRODUCTION_URL${NC}"
    
    # Check if running in correct mode
    if [ "$CURRENT_MODE" = "development" ] && [ "$CURRENT_BASE_URL" = "$NGROK_URL" ]; then
        echo -e "${GREEN}✅ Currently in development mode${NC}"
    elif [ "$CURRENT_MODE" = "production" ] && [ "$CURRENT_BASE_URL" = "$PRODUCTION_URL" ]; then
        echo -e "${GREEN}✅ Currently in production mode${NC}"
    else
        echo -e "${YELLOW}⚠️  Mode and URLs don't match - consider running switch${NC}"
    fi
}

# Parse command line arguments
case "$1" in
    dev|development)
        switch_to_dev
        ;;
    prod|production)
        switch_to_prod
        ;;
    status)
        show_status
        ;;
    update-ngrok)
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Please provide the new ngrok URL${NC}"
            echo "Example: $0 update-ngrok https://abcd1234.ngrok-free.app"
            exit 1
        fi
        update_ngrok "$2"
        ;;
    --help|-h)
        usage
        exit 0
        ;;
    "")
        echo -e "${YELLOW}No mode specified. Showing current status:${NC}"
        echo ""
        show_status
        echo ""
        echo -e "${BLUE}To switch modes:${NC}"
        echo "  $0 dev     # Switch to development"
        echo "  $0 prod    # Switch to production"
        ;;
    *)
        echo -e "${RED}❌ Unknown mode: $1${NC}"
        usage
        exit 1
        ;;
esac