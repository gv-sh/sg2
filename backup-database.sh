#!/bin/bash

# SpecGen v2 Database Backup Utility
# Manual backup and restore utility for the SQLite database

set -e

# Configuration
EC2_HOST="${EC2_HOST:-}"
EC2_KEY="${EC2_KEY:-./debanshu.pem}"
APP_DIR="${APP_DIR:-/home/ubuntu/sg2}"
BACKUP_DIR="/home/ubuntu/backups"
LOCAL_BACKUP_DIR="./backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to show usage
usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  backup          Create a timestamped backup of the remote database"
    echo "  download        Download the latest database backup to local machine"
    echo "  list            List all available backups on remote server"
    echo "  restore         Restore database from a specific backup"
    echo "  cleanup         Remove old backups (keeps last 10)"
    echo ""
    echo "Options:"
    echo "  --backup-name   Specify backup name for restore command"
    echo "  --local         Work with local database instead of remote"
    echo ""
    echo "Examples:"
    echo "  $0 backup                                    # Create backup"
    echo "  $0 download                                  # Download latest backup"
    echo "  $0 list                                      # List all backups"
    echo "  $0 restore --backup-name specgen_backup_20241208_143021.db"
    echo "  $0 backup --local                           # Backup local database"
}

# Function to run commands on EC2
run_on_ec2() {
    ssh -i "$EC2_KEY" "$EC2_HOST" "$1"
}

# Function to copy files from EC2
copy_from_ec2() {
    scp -i "$EC2_KEY" "$EC2_HOST:$1" "$2"
}

# Function to copy files to EC2
copy_to_ec2() {
    scp -i "$EC2_KEY" "$1" "$EC2_HOST:$2"
}

# Check if EC2 connection is needed
check_ec2_connection() {
    if [ "$LOCAL_MODE" != "true" ]; then
        if [ -z "$EC2_HOST" ]; then
            echo -e "${YELLOW}🔑 Enter your EC2 SSH connection string:${NC}"
            read -p "EC2 Host: " EC2_HOST
            if [ -z "$EC2_HOST" ]; then
                echo -e "${RED}❌ EC2 host is required for remote operations!${NC}"
                exit 1
            fi
        fi
        
        if [ ! -f "$EC2_KEY" ]; then
            echo -e "${RED}❌ SSH key file '$EC2_KEY' not found!${NC}"
            exit 1
        fi
    fi
}

# Function to create backup
create_backup() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    if [ "$LOCAL_MODE" = "true" ]; then
        echo -e "${YELLOW}💾 Creating local database backup...${NC}"
        
        # Create local backup directory
        mkdir -p "$LOCAL_BACKUP_DIR"
        
        if [ -f "./data/specgen.db" ]; then
            cp "./data/specgen.db" "$LOCAL_BACKUP_DIR/specgen_backup_$TIMESTAMP.db"
            echo -e "${GREEN}✅ Local database backed up to: $LOCAL_BACKUP_DIR/specgen_backup_$TIMESTAMP.db${NC}"
        else
            echo -e "${RED}❌ Local database not found at ./data/specgen.db${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}💾 Creating remote database backup...${NC}"
        
        run_on_ec2 "
            # Create backup directory if it doesn't exist
            mkdir -p '$BACKUP_DIR'
            
            # Create database backup
            if [ -f '$APP_DIR/data/specgen.db' ]; then
                cp '$APP_DIR/data/specgen.db' '$BACKUP_DIR/specgen_backup_$TIMESTAMP.db'
                echo 'Database backed up to: $BACKUP_DIR/specgen_backup_$TIMESTAMP.db'
                
                # Show backup size
                du -h '$BACKUP_DIR/specgen_backup_$TIMESTAMP.db'
            else
                echo 'No database found at $APP_DIR/data/specgen.db'
                exit 1
            fi
        "
        echo -e "${GREEN}✅ Remote database backup completed${NC}"
    fi
}

# Function to download latest backup
download_backup() {
    echo -e "${YELLOW}📥 Downloading latest database backup...${NC}"
    
    # Create local backup directory
    mkdir -p "$LOCAL_BACKUP_DIR"
    
    # Get the latest backup filename
    LATEST_BACKUP=$(run_on_ec2 "ls -t '$BACKUP_DIR'/specgen_backup_*.db 2>/dev/null | head -1 || echo ''")
    
    if [ -z "$LATEST_BACKUP" ]; then
        echo -e "${RED}❌ No backups found on remote server${NC}"
        exit 1
    fi
    
    BACKUP_FILENAME=$(basename "$LATEST_BACKUP")
    
    # Download the backup
    copy_from_ec2 "$LATEST_BACKUP" "$LOCAL_BACKUP_DIR/$BACKUP_FILENAME"
    
    echo -e "${GREEN}✅ Downloaded backup: $LOCAL_BACKUP_DIR/$BACKUP_FILENAME${NC}"
    
    # Show backup size
    echo -e "${BLUE}📊 Backup size: $(du -h "$LOCAL_BACKUP_DIR/$BACKUP_FILENAME" | cut -f1)${NC}"
}

# Function to list backups
list_backups() {
    if [ "$LOCAL_MODE" = "true" ]; then
        echo -e "${BLUE}📋 Local database backups:${NC}"
        if [ -d "$LOCAL_BACKUP_DIR" ] && [ "$(ls -A $LOCAL_BACKUP_DIR/specgen_backup_*.db 2>/dev/null)" ]; then
            ls -lah "$LOCAL_BACKUP_DIR"/specgen_backup_*.db
        else
            echo -e "${YELLOW}No local backups found${NC}"
        fi
    else
        echo -e "${BLUE}📋 Remote database backups:${NC}"
        run_on_ec2 "
            if [ -d '$BACKUP_DIR' ] && [ \"\$(ls -A $BACKUP_DIR/specgen_backup_*.db 2>/dev/null)\" ]; then
                ls -lah '$BACKUP_DIR'/specgen_backup_*.db
            else
                echo 'No remote backups found'
            fi
        "
    fi
}

# Function to restore database
restore_database() {
    if [ -z "$BACKUP_NAME" ]; then
        echo -e "${RED}❌ Backup name is required for restore operation${NC}"
        echo -e "${YELLOW}Use: $0 restore --backup-name <backup_filename>${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️  WARNING: This will replace the current database!${NC}"
    read -p "Are you sure you want to continue? (y/N): " -r CONFIRM
    
    if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Operation cancelled${NC}"
        exit 0
    fi
    
    if [ "$LOCAL_MODE" = "true" ]; then
        echo -e "${YELLOW}♻️  Restoring local database...${NC}"
        
        if [ -f "$LOCAL_BACKUP_DIR/$BACKUP_NAME" ]; then
            # Create data directory if it doesn't exist
            mkdir -p "./data"
            
            # Backup current database
            if [ -f "./data/specgen.db" ]; then
                CURRENT_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
                cp "./data/specgen.db" "$LOCAL_BACKUP_DIR/specgen_current_$CURRENT_TIMESTAMP.db"
                echo -e "${BLUE}Current database backed up as: specgen_current_$CURRENT_TIMESTAMP.db${NC}"
            fi
            
            # Restore the backup
            cp "$LOCAL_BACKUP_DIR/$BACKUP_NAME" "./data/specgen.db"
            echo -e "${GREEN}✅ Local database restored from: $BACKUP_NAME${NC}"
        else
            echo -e "${RED}❌ Backup file not found: $LOCAL_BACKUP_DIR/$BACKUP_NAME${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}♻️  Restoring remote database...${NC}"
        
        # Stop the application first
        echo -e "${YELLOW}🛑 Stopping application...${NC}"
        run_on_ec2 "cd '$APP_DIR' && npx pm2 stop sg2 || true"
        
        # Restore database
        run_on_ec2 "
            if [ -f '$BACKUP_DIR/$BACKUP_NAME' ]; then
                # Backup current database
                if [ -f '$APP_DIR/data/specgen.db' ]; then
                    CURRENT_TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
                    cp '$APP_DIR/data/specgen.db' '$BACKUP_DIR/specgen_current_\$CURRENT_TIMESTAMP.db'
                    echo 'Current database backed up as: specgen_current_\$CURRENT_TIMESTAMP.db'
                fi
                
                # Ensure data directory exists
                mkdir -p '$APP_DIR/data'
                
                # Restore the backup
                cp '$BACKUP_DIR/$BACKUP_NAME' '$APP_DIR/data/specgen.db'
                echo 'Database restored from: $BACKUP_NAME'
            else
                echo 'Backup file not found: $BACKUP_DIR/$BACKUP_NAME'
                exit 1
            fi
        "
        
        # Restart the application
        echo -e "${YELLOW}🚀 Starting application...${NC}"
        run_on_ec2 "cd '$APP_DIR' && npx pm2 start sg2"
        
        echo -e "${GREEN}✅ Remote database restore completed${NC}"
    fi
}

# Function to cleanup old backups
cleanup_backups() {
    if [ "$LOCAL_MODE" = "true" ]; then
        echo -e "${YELLOW}🧹 Cleaning up local backups (keeping last 10)...${NC}"
        
        if [ -d "$LOCAL_BACKUP_DIR" ]; then
            cd "$LOCAL_BACKUP_DIR" && ls -t specgen_backup_*.db 2>/dev/null | tail -n +11 | xargs rm -f || true
            echo -e "${GREEN}✅ Local backup cleanup completed${NC}"
        else
            echo -e "${YELLOW}No local backup directory found${NC}"
        fi
    else
        echo -e "${YELLOW}🧹 Cleaning up remote backups (keeping last 10)...${NC}"
        
        run_on_ec2 "
            if [ -d '$BACKUP_DIR' ]; then
                cd '$BACKUP_DIR' && ls -t specgen_backup_*.db 2>/dev/null | tail -n +11 | xargs rm -f || true
                echo 'Remote backup cleanup completed'
            else
                echo 'No remote backup directory found'
            fi
        "
        echo -e "${GREEN}✅ Remote backup cleanup completed${NC}"
    fi
}

# Parse command line arguments
COMMAND=""
BACKUP_NAME=""
LOCAL_MODE="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        backup|download|list|restore|cleanup)
            COMMAND="$1"
            shift
            ;;
        --backup-name)
            BACKUP_NAME="$2"
            shift 2
            ;;
        --local)
            LOCAL_MODE="true"
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Show usage if no command provided
if [ -z "$COMMAND" ]; then
    usage
    exit 1
fi

# Check EC2 connection for remote operations
check_ec2_connection

# Execute command
case $COMMAND in
    backup)
        create_backup
        ;;
    download)
        download_backup
        ;;
    list)
        list_backups
        ;;
    restore)
        restore_database
        ;;
    cleanup)
        cleanup_backups
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
        usage
        exit 1
        ;;
esac