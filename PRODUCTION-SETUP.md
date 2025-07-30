# Production Setup Guide
## Quirofísicos Rocha - Deployment & Production Configuration

### 🌐 Production Deployment Options

#### Option 1: DigitalOcean Droplet (Recommended)
**Cost:** $12-24/month | **Specs:** 2GB RAM, 1 CPU, 50GB SSD

#### Option 2: AWS EC2 
**Cost:** $15-30/month | **Specs:** t3.small instance

#### Option 3: VPS Hosting (Hostinger, Vultr)
**Cost:** $8-15/month | **Specs:** 2GB RAM, 40GB storage

---

## 🚀 DigitalOcean Deployment (Step-by-Step)

### 1. Server Setup

```bash
# Create new droplet on DigitalOcean
# Choose: Ubuntu 22.04, 2GB RAM, $12/month
# Select region closest to Mexico (e.g., Toronto)

# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install MySQL
apt install mysql-server -y
mysql_secure_installation

# Install PM2 (Process Manager)
npm install -g pm2

# Install Nginx (Reverse Proxy)
apt install nginx -y

# Install SSL (Let's Encrypt)
apt install certbot python3-certbot-nginx -y
```

### 2. Application Deployment

```bash
# Clone your repository
cd /var/www
git clone https://github.com/ulisesd15/quirofisicosRocha.git
cd quirofisicosRocha

# Install dependencies
npm install --production

# Set up production environment
cp .env.example .env.production
nano .env.production
```

### 3. Production Environment Configuration

```bash
# /var/www/quirofisicosRocha/.env.production
NODE_ENV=production
PORT=3001

# Database Configuration
DB_USER=root
DB_PASSWORD=your-secure-production-password
DB_HOST=localhost
DB_NAME=appointments_db_prod

# JWT Secrets (Generate new ones!)
SECRET_KEY=your-super-secure-secret-key-production
JWT_SECRET=your-jwt-secret-production

# Google OAuth
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-secret
GOOGLE_CALLBACK_URL=https://quirofisicosrocha.com/api/auth/google/callback

# Vonage SMS (Production)
VONAGE_API_KEY=your-vonage-api-key
VONAGE_API_SECRET=your-vonage-api-secret
VONAGE_FROM_NUMBER=your-vonage-phone-number

# Production Settings
WEBSITE_URL=https://quirofisicosrocha.com
ADMIN_PHONE_NUMBER=+526641234567
DEBUG_MODE=false

# Trusted Origins
TRUSTED_ORIGINS=https://quirofisicosrocha.com,https://www.quirofisicosrocha.com
```

### 4. Database Setup

```bash
# Create production database
mysql -u root -p
CREATE DATABASE appointments_db_prod;
CREATE USER 'appointments_user'@'localhost' IDENTIFIED BY 'secure-db-password';
GRANT ALL PRIVILEGES ON appointments_db_prod.* TO 'appointments_user'@'localhost';
FLUSH PRIVILEGES;
exit

# Import schema
mysql -u root -p appointments_db_prod < db/schema.sql

# Seed initial data
mysql -u root -p appointments_db_prod < db/seeds.sql
```

### 5. PM2 Process Management

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'quirofisicos-rocha',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000
  }]
};
EOF

# Create logs directory
mkdir logs

# Start application with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 6. Nginx Configuration

```bash
# Create Nginx config
cat > /etc/nginx/sites-available/quirofisicosrocha << 'EOF'
server {
    listen 80;
    server_name quirofisicosrocha.com www.quirofisicosrocha.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=main:10m rate=10r/s;
    limit_req zone=main burst=20 nodelay;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/quirofisicosrocha /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 7. SSL Certificate Setup

```bash
# Get SSL certificate from Let's Encrypt
certbot --nginx -d quirofisicosrocha.com -d www.quirofisicosrocha.com

# Auto-renewal (already set up by certbot)
# Verify with: certbot renew --dry-run
```

### 8. Domain Configuration

**DNS Records to set up:**
```
Type: A Record
Name: @
Value: your-server-ip

Type: A Record  
Name: www
Value: your-server-ip

Type: CNAME Record
Name: admin
Value: quirofisicosrocha.com
```

---

## 🔒 Security Configuration

### 1. Firewall Setup
```bash
# Configure UFW firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 3306  # MySQL (only if needed externally)
ufw enable
```

### 2. MySQL Security
```bash
# Secure MySQL installation
mysql_secure_installation
# Answer YES to all security questions

# Create dedicated database user
mysql -u root -p
DROP USER IF EXISTS 'appointments_user'@'localhost';
CREATE USER 'appointments_user'@'localhost' IDENTIFIED BY 'ultra-secure-password-123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments_db_prod.* TO 'appointments_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Application Security
```bash
# Set proper file permissions
chmod 750 /var/www/quirofisicosRocha
chown -R www-data:www-data /var/www/quirofisicosRocha
chmod 600 .env.production

# Secure sensitive files
chmod 600 /var/www/quirofisicosRocha/.env.production
```

---

## 📊 Monitoring & Maintenance

### 1. Server Monitoring Setup
```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-server-monit

# Set up log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. Database Backup Script
```bash
# Create backup script
cat > /var/www/quirofisicosRocha/scripts/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/quirofisicos"
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u root -p'your-password' appointments_db_prod > $BACKUP_DIR/db_backup_$DATE.sql

# Application backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /var/www/quirofisicosRocha

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /var/www/quirofisicosRocha/scripts/backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /var/www/quirofisicosRocha/scripts/backup.sh
```

### 3. Monitoring Dashboard URLs
- **PM2 Monitoring:** `http://your-domain.com:9615` (if enabled)
- **Server Stats:** SSH + `htop`, `pm2 monit`
- **MySQL Monitoring:** `mysql -u root -p -e "SHOW PROCESSLIST;"`

---

## 🚀 Deployment Automation

### 1. Automated Deployment Script
```bash
# Create deploy script
cat > /var/www/quirofisicosRocha/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest changes
git pull origin main

# Install/update dependencies
npm install --production

# Run database migrations (if any)
# mysql -u appointments_user -p appointments_db_prod < db/migrations/latest.sql

# Restart application
pm2 restart quirofisicos-rocha

echo "✅ Deployment complete!"
EOF

chmod +x deploy.sh
```

### 2. GitHub Webhooks (Optional)
Set up automatic deployment when you push to main branch.

---

## 🎯 Production Checklist

### Before Going Live:
- [ ] Domain purchased and DNS configured
- [ ] SSL certificate installed and working
- [ ] Database secured with strong passwords
- [ ] All environment variables configured
- [ ] SMS service credentials added (Vonage)
- [ ] Google OAuth configured for production domain
- [ ] Firewall configured and enabled
- [ ] Backup system tested
- [ ] Error monitoring set up
- [ ] Performance testing completed
- [ ] Admin user created in production database

### Post-Launch Monitoring:
- [ ] Check PM2 processes: `pm2 status`
- [ ] Monitor logs: `pm2 logs`
- [ ] Test SMS functionality
- [ ] Verify SSL certificate
- [ ] Check database connections
- [ ] Test appointment booking flow
- [ ] Monitor server resources: `htop`

---

## 💰 Estimated Monthly Costs

| Service | Cost | Purpose |
|---------|------|---------|
| DigitalOcean Droplet | $12-24 | Server hosting |
| Domain (.com) | $1-2 | Domain registration |
| Vonage SMS | $10-50 | SMS notifications |
| **Total** | **$23-76/month** | Complete solution |

---

## 📞 Emergency Procedures

### If Site Goes Down:
```bash
# Check PM2 processes
pm2 status
pm2 restart all

# Check Nginx
systemctl status nginx
systemctl restart nginx

# Check MySQL
systemctl status mysql
systemctl restart mysql

# Check logs
pm2 logs --lines 50
tail -f /var/log/nginx/error.log
```

### Database Recovery:
```bash
# Restore from backup
mysql -u root -p appointments_db_prod < /var/backups/quirofisicos/db_backup_YYYYMMDD.sql
```

This production setup will give you a professional, secure, and scalable deployment ready for real users!
