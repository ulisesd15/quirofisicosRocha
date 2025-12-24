### Next Steps for Production Deployment

1. **Update Domain Configuration**
   ```bash
   # Update .env.production with your domain
   GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
   TRUSTED_ORIGINS=https://yourdomain.com
   ```

2. **Change Default Passwords**
   ```bash
   # Login to admin panel and change admin password
   # Update database passwords to more secure ones
   ```

3. **Setup SSL Certificate**
   ```bash
   sudo certbot certonly --standalone -d yourdomain.com
   ```

4. **Configure Nginx Reverse Proxy**
   ```bash
   # Copy configuration from PRODUCTION-GUIDE.md
   sudo systemctl restart nginx
   ```

5. **Start with PM2**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

6. **Setup Database Backups**
   ```bash
   chmod +x scripts/backup-db.sh
   # Add to crontab for daily backups
   ```

## 🔍 Testing Commands

### Start Production Server
```bash
NODE_ENV=production npm start
```

### Test API Endpoints
```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/admin/appointments/pending
```

### Database Verification
```bash
node scripts/setup-db.js
```

## 📊 Monitoring

### Check Server Status
```bash
pm2 status
pm2 logs quirofisicos-rocha
pm2 monit
```

### Database Monitoring
```sql
SHOW PROCESSLIST;
SELECT COUNT(*) FROM appointments;
SELECT COUNT(*) FROM users WHERE is_verified = FALSE;
```

## 🚨 Important Notes

1. **Change the admin password immediately after deployment**
2. **Update Google OAuth callback URL for your domain**
3. **Configure proper SSL certificates**
4. **Set up regular database backups**
5. **Monitor application logs regularly**
6. **Update Vonage webhook URLs if needed**

## 📞 Support Information

- **Application Logs**: `./logs/` directory
- **Database Logs**: MySQL error logs
- **Process Monitoring**: PM2 dashboard
- **Health Check**: `GET /api/health`

Your application is now production-ready! 🎉
