#!/bin/bash
# Production Deployment Script for DigitalOcean/VPS
# Run this on your production server after initial setup

set -e

APP_NAME="quirofisicos-rocha"
APP_DIR="/var/www/quirofisicosRocha"
BACKUP_DIR="/var/backups/quirofisicos"

echo "🚀 Production Deployment Script"
echo "================================="

# Function to create backup
create_backup() {
    echo "📦 Creating backup..."
    mkdir -p $BACKUP_DIR
    DATE=$(date +%Y%m%d_%H%M%S)
    
    # Backup database
    mysqldump -u appointments_user -p appointments_db_prod > $BACKUP_DIR/db_backup_$DATE.sql
    
    # Backup application (if exists)
    if [ -d "$APP_DIR" ]; then
        tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz $APP_DIR
    fi
    
    echo "✅ Backup created: $DATE"
}

# Function to deploy application
deploy_app() {
    echo "🔄 Deploying application..."
    
    # Navigate to app directory
    cd $APP_DIR
    
    # Pull latest changes
    git pull origin main
    
    # Install dependencies
    npm install --production --silent
    
    # Run any database migrations (future feature)
    # mysql -u appointments_user -p appointments_db_prod < db/migrations/*.sql
    
    echo "✅ Application updated"
}

# Function to restart services
restart_services() {
    echo "🔄 Restarting services..."
    
    # Restart PM2 processes
    pm2 restart $APP_NAME
    
    # Restart Nginx
    systemctl reload nginx
    
    echo "✅ Services restarted"
}

# Function to verify deployment
verify_deployment() {
    echo "🔍 Verifying deployment..."
    
    # Check PM2 status
    if pm2 show $APP_NAME > /dev/null 2>&1; then
        echo "✅ PM2 process running"
    else
        echo "❌ PM2 process not found"
        exit 1
    fi
    
    # Check if application responds
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        echo "✅ Application responding"
    else
        echo "❌ Application not responding"
        exit 1
    fi
    
    # Check Nginx status
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx running"
    else
        echo "❌ Nginx not running"
        exit 1
    fi
    
    echo "✅ Deployment verified successfully"
}

# Main deployment process
main() {
    echo "Starting deployment process..."
    
    # Check if running as root or with sudo
    if [ "$EUID" -ne 0 ]; then
        echo "❌ Please run as root or with sudo"
        exit 1
    fi
    
    # Check if app directory exists
    if [ ! -d "$APP_DIR" ]; then
        echo "❌ Application directory not found: $APP_DIR"
        echo "Please run initial setup first"
        exit 1
    fi
    
    # Create backup before deployment
    create_backup
    
    # Deploy application
    deploy_app
    
    # Restart services
    restart_services
    
    # Verify deployment
    sleep 3
    verify_deployment
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "🌐 Website: https://quirofisicosrocha.com"
    echo "⚙️  Admin Panel: https://quirofisicosrocha.com/admin/adminOptions.html"
    echo ""
    echo "📊 Monitoring commands:"
    echo "   pm2 status"
    echo "   pm2 logs $APP_NAME"
    echo "   pm2 monit"
    echo ""
}

# Run main function
main "$@"
