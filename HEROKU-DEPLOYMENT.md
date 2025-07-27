# 🚀 Heroku Deployment Guide - Quirofísicos Rocha

## Prerequisites

1. **Install Heroku CLI**
   ```bash
   # Windows (using winget)
   winget install Heroku.CLI
   
   # Or download from: https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Create Heroku Account**
   - Go to https://signup.heroku.com/
   - Sign up for a free account

3. **Install Git** (if not already installed)
   ```bash
   # Windows
   winget install Git.Git
   ```

## Step-by-Step Deployment

### 1. Login to Heroku
```bash
heroku login
```

### 2. Prepare Your Repository
```bash
# Navigate to your project directory
cd c:\Users\ulise\bootcamp\quirofisicosRocha

# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit - Quirofísicos Rocha appointment system"
```

### 3. Create Heroku Application
```bash
# Create a new Heroku app (replace 'your-app-name' with your desired name)
heroku create quirofisicos-rocha-app

# Or let Heroku generate a random name
heroku create
```

### 4. Add JawsDB MySQL Add-on
```bash
# Add JawsDB MySQL (free tier)
heroku addons:create jawsdb:kitefin

# Get database connection info
heroku config:get JAWSDB_URL
```

### 5. Set Environment Variables
```bash
# Set production environment variables
heroku config:set NODE_ENV=production

# Secret key (generate a new one for production)
heroku config:set SECRET_KEY=your_production_secret_key_64_chars_minimum

# Google OAuth (update callback URL to match your Heroku domain)
heroku config:set GOOGLE_CLIENT_ID=your-google-client-id
heroku config:set GOOGLE_CLIENT_SECRET=your-google-client-secret
heroku config:set GOOGLE_CALLBACK_URL=https://your-app-name.herokuapp.com/api/auth/google/callback

# Google Maps API
heroku config:set GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Vonage SMS
heroku config:set VONAGE_API_KEY=e392d934
heroku config:set VONAGE_API_SECRET=M5NkXBw4x1MPmWQU
heroku config:set VONAGE_FROM_NUMBER=16303298763

# Trusted origins
heroku config:set TRUSTED_ORIGINS=https://your-app-name.herokuapp.com
```

### 6. Update Database Configuration for Production

Create a new file `config/database.js` to handle Heroku's database URL:

```javascript
const mysql = require('mysql2');

// Parse JawsDB URL for production
function parseDbUrl(url) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (match) {
    return {
      host: match[3],
      user: match[1],
      password: match[2],
      database: match[5],
      port: match[4]
    };
  }
  return null;
}

let dbConfig;

if (process.env.NODE_ENV === 'production' && process.env.JAWSDB_URL) {
  // Production with JawsDB
  dbConfig = parseDbUrl(process.env.JAWSDB_URL);
} else {
  // Development
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'kimpembe',
    database: process.env.DB_NAME || 'appointments_db'
  };
}

const connection = mysql.createConnection(dbConfig);

module.exports = connection;
```

### 7. Update Your Application Files

**Update `config/connections.js`** to use the new database configuration:
```javascript
const db = require('./database');
module.exports = db;
```

**Update `server.js`** to use PORT from environment:
```javascript
const PORT = process.env.PORT || 3001;
```

### 8. Create Procfile
Create a file named `Procfile` (no extension) in your root directory:
```
web: node server.js
release: node scripts/setup-db.js
```

### 9. Update Google OAuth Settings
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Edit your OAuth 2.0 Client
4. Add to "Authorized redirect URIs":
   ```
   https://your-app-name.herokuapp.com/api/auth/google/callback
   ```

### 10. Deploy to Heroku
```bash
# Add Heroku remote (if not automatically added)
git remote add heroku https://git.heroku.com/your-app-name.git

# Push to Heroku
git push heroku main

# Or if you're on a different branch
git push heroku your-branch:main
```

### 11. Set Up Database
The database setup will run automatically via the `release` command in Procfile, but you can also run it manually:
```bash
heroku run node scripts/setup-db.js
```

### 12. Open Your Application
```bash
heroku open
```

## Post-Deployment Configuration

### 1. Change Default Admin Password
1. Go to your deployed app: `https://your-app-name.herokuapp.com`
2. Login with: `admin@quirofisicosrocha.com` / `admin123`
3. Go to User Settings and change the password immediately

### 2. Test All Features
- [ ] User registration
- [ ] User login (both email and Google OAuth)
- [ ] Appointment booking
- [ ] SMS notifications
- [ ] Admin panel access
- [ ] User verification system

### 3. Monitor Application
```bash
# View logs
heroku logs --tail

# Check app status
heroku ps

# Restart app if needed
heroku restart
```

## Important Security Updates

### 1. Update Environment Variables
Replace these with production values:
```bash
# Generate a new secret key
heroku config:set SECRET_KEY=$(openssl rand -hex 64)

# Update callback URL with your actual Heroku domain
heroku config:set GOOGLE_CALLBACK_URL=https://your-actual-app-name.herokuapp.com/api/auth/google/callback

# Update trusted origins
heroku config:set TRUSTED_ORIGINS=https://your-actual-app-name.herokuapp.com
```

### 2. Database Security
- JawsDB provides SSL by default
- Change default admin password immediately
- Monitor database access logs

## Troubleshooting

### Common Issues:

1. **Application Error (H10)**
   ```bash
   # Check logs
   heroku logs --tail
   
   # Ensure PORT is from environment
   const PORT = process.env.PORT || 3001;
   ```

2. **Database Connection Issues**
   ```bash
   # Check if JawsDB is attached
   heroku addons
   
   # Check database URL
   heroku config:get JAWSDB_URL
   ```

3. **OAuth Not Working**
   - Verify callback URL in Google Console
   - Check GOOGLE_CALLBACK_URL environment variable

4. **SMS Not Working**
   - Verify Vonage credentials
   - Check account balance at dashboard.nexmo.com

### Useful Heroku Commands:
```bash
# View all config vars
heroku config

# Scale dynos
heroku ps:scale web=1

# Run database commands
heroku run node scripts/setup-db.js

# Access Heroku bash
heroku run bash

# View addon details
heroku addons:info jawsdb
```

## Cost Optimization

### Free Tier Limits:
- Heroku: 550-1000 dyno hours/month (free)
- JawsDB: 5MB database (free)
- Vonage: €2 free trial credit

### Upgrading:
- **Heroku Hobby**: $7/month (no sleep, custom domains)
- **JawsDB Leopard**: $9.99/month (1GB database)

Your application is now deployed to Heroku and ready for production use! 🎉

## Final Checklist:
- [ ] App deployed successfully
- [ ] Database setup completed
- [ ] Admin password changed
- [ ] Google OAuth working
- [ ] SMS notifications working
- [ ] All features tested
- [ ] Domain configured (if using custom domain)
