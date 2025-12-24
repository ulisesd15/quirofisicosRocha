# Quirofísicos Rocha - Production Deployment Guide

## 🚀 Production Setup

### Prerequisites
- Node.js 16+ and npm 8+
- MySQL 8.0+ server
- Domain name and SSL certificate (for production)
- Server with at least 1GB RAM

### 1. Server Setup

#### Install Dependencies
```bash
npm install --production
```

#### Install Additional Production Dependencies
```bash
npm install helmet compression express-rate-limit cors
```

### 2. Environment Configuration

#### Copy and configure production environment:
```bash
cp .env.example .env.production
```

#### Update `.env.production` with your production values:
```env
# Database Configuration
DB_HOST=your_production_db_host
DB_USER=your_db_username
DB_PASSWORD=your_secure_db_password
DB_NAME=appointments_db

# Application Configuration
SECRET_KEY=your_strong_secret_key_64_chars_minimum
PORT=3001
NODE_ENV=production

# Google OAuth (Update for production domain)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Vonage SMS Configuration
VONAGE_API_KEY=your_vonage_api_key
VONAGE_API_SECRET=your_vonage_api_secret
VONAGE_FROM_NUMBER=your_vonage_phone_number

# Production Security
TRUSTED_ORIGINS=https://yourdomain.com
SESSION_SECRET=your_session_secret
```

### 3. Database Setup

#### Initialize the database:
```bash
npm run db:setup
```

This will:
- Create all required tables
- Set up default business hours
- Create admin user (admin@quirofisicosrocha.com / admin123)

### 4. SSL Certificate Setup (Required for Production)

For Let's Encrypt SSL:
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
```

### 5. Reverse Proxy Setup (Nginx)

#### Install Nginx:
```bash
sudo apt install nginx
```

#### Create Nginx configuration (`/etc/nginx/sites-available/quirofisicos`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

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
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/quirofisicos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Process Management (PM2)

#### Install PM2:
```bash
npm install -g pm2
```

#### Create PM2 ecosystem file (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'quirofisicos-rocha',
    script: 'server.js',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

#### Start the application:
```bash
mkdir logs
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 7. Database Backup Strategy

#### Create backup script (`scripts/backup-db.sh`):
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/quirofisicos"
mkdir -p $BACKUP_DIR

mysqldump -u root -p$DB_PASSWORD appointments_db > $BACKUP_DIR/appointments_db_$DATE.sql
gzip $BACKUP_DIR/appointments_db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

#### Setup daily backup cron:
```bash
chmod +x scripts/backup-db.sh
crontab -e
# Add: 0 2 * * * /path/to/your/app/scripts/backup-db.sh
```

### 8. Monitoring Setup

#### Install monitoring tools:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
```

### 9. Security Checklist

- [ ] Change default admin password
- [ ] Use strong database passwords
- [ ] Configure firewall (UFW)
- [ ] Enable fail2ban
- [ ] Set up regular security updates
- [ ] Monitor access logs
- [ ] Use environment variables for secrets
- [ ] Enable SSL/HTTPS
- [ ] Configure rate limiting

### 10. Performance Optimization

#### MySQL Configuration (`/etc/mysql/mysql.conf.d/mysqld.cnf`):
```ini
[mysqld]
innodb_buffer_pool_size = 512M
innodb_log_file_size = 64M
max_connections = 200
query_cache_size = 64M
```

### 11. Deployment Commands

#### Start production server:
```bash
NODE_ENV=production npm start
```

#### Or with PM2:
```bash
pm2 start ecosystem.config.js --env production
```

#### Check application status:
```bash
pm2 status
pm2 logs quirofisicos-rocha
```

#### Restart application:
```bash
pm2 restart quirofisicos-rocha
```

### 12. Health Check

The application includes health endpoints:
- `GET /api/health` - Basic health check
- `GET /api/status` - Detailed status information

### 🔧 Troubleshooting

#### Common Issues:

1. **Database Connection Failed**
   - Check MySQL service: `sudo systemctl status mysql`
   - Verify credentials in `.env.production`
   - Check firewall settings

2. **SMS Not Working**
   - Verify Vonage credentials
   - Check account balance
   - Verify phone number format

3. **SSL Certificate Issues**
   - Renew certificate: `sudo certbot renew`
   - Check certificate expiry: `sudo certbot certificates`

4. **High Memory Usage**
   - Check PM2 logs: `pm2 logs`
   - Monitor with: `pm2 monit`
   - Restart if needed: `pm2 restart quirofisicos-rocha`

### 📞 Support

For production support or questions, refer to the application logs and monitoring tools configured above.
