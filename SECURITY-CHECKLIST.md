# 🔒 SECURITY CHECKLIST - QUIROFÍSICOS ROCHA

## ⚠️ BEFORE PRODUCTION DEPLOYMENT

### 1. Environment Variables Security
- [ ] ✅ All sensitive data moved to `.env` file
- [ ] ✅ `.env` file added to `.gitignore`
- [ ] ✅ `.env.example` created for other developers
- [ ] 🔄 Generate new, strong random secrets for production
- [ ] 🔄 Update all API keys with production versions
- [ ] 🔄 Set `NODE_ENV=production`

### 2. Database Security  
- [ ] ✅ Database cleaned of unnecessary tables
- [ ] 🔄 Change default admin password from `Password123!`
- [ ] 🔄 Use strong database password in production
- [ ] 🔄 Enable database SSL connections for production
- [ ] ⚠️ Never use root database user in production

### 3. Authentication & Authorization
- [ ] ✅ JWT secrets are long and random
- [ ] ✅ Session secrets are unique and secure
- [ ] 🔄 Set secure cookie options for production
- [ ] 🔄 Enable HTTPS-only cookies
- [ ] 🔄 Set proper session expiration times

### 4. API Security
- [ ] ✅ Rate limiting implemented
- [ ] ✅ CORS properly configured
- [ ] 🔄 Enable HTTPS in production
- [ ] 🔄 Add API input validation
- [ ] 🔄 Set security headers (helmet.js)

### 5. Third-Party Services
- [ ] ✅ Google OAuth configured with production URLs
- [ ] ✅ Google Maps API key restricted to your domain
- [ ] ✅ Vonage SMS service configured
- [ ] 🔄 Restrict Google OAuth to specific domains
- [ ] 🔄 Monitor API usage and set quotas

### 6. Code Security
- [ ] ✅ No console.log statements with sensitive data
- [ ] ✅ No hardcoded credentials in code
- [ ] 🔄 Update all npm packages to latest versions
- [ ] 🔄 Run `npm audit` and fix vulnerabilities
- [ ] 🔄 Add proper error handling (don't expose internal errors)

## 📋 PRODUCTION ENVIRONMENT VARIABLES TO CHANGE

### Must Change These Values:
```env
# Generate new random secrets (32+ characters each)
SECRET_KEY=CHANGE-THIS-TO-LONG-RANDOM-STRING
JWT_SECRET=CHANGE-THIS-TO-LONG-RANDOM-STRING  
SESSION_SECRET=CHANGE-THIS-TO-LONG-RANDOM-STRING
COOKIE_SECRET=CHANGE-THIS-TO-LONG-RANDOM-STRING

# Update to production database
DB_PASSWORD=CHANGE-THIS-TO-STRONG-PASSWORD
DB_USER=CHANGE-THIS-DONT-USE-ROOT

# Update URLs for production
WEBSITE_URL=https://your-domain.com
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback

# Set production mode
NODE_ENV=production
DEBUG_MODE=false
```

## 🛡️ RECOMMENDED PRODUCTION SECURITY ADDITIONS

### 1. Add Helmet.js for Security Headers
```bash
npm install helmet
```

### 2. Add HTTPS Redirect Middleware
```javascript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### 3. Secure Cookie Settings
```javascript
app.use(session({
  cookie: {
    secure: true,      // HTTPS only
    httpOnly: true,    // No client-side access
    maxAge: 3600000    // 1 hour
  }
}));
```

## 🚨 SENSITIVE INFORMATION IN CURRENT .ENV

### 🔴 HIGH PRIORITY (Change before production):
- `DB_PASSWORD=kimpembe` - Change to strong password
- `SECRET_KEY` & `JWT_SECRET` - Generate new random strings
- All Google API keys - Restrict to production domain
- Vonage API credentials - Monitor usage

### 🟡 MEDIUM PRIORITY:
- `ADMIN_PHONE_NUMBER` - Verify correct for production
- `EMAIL_USER` & `EMAIL_PASS` - Set up production email account

## ✅ DEPLOYMENT CHECKLIST

1. [ ] Copy `.env.example` to production server
2. [ ] Fill in production values in `.env`
3. [ ] Test all functionality with production credentials
4. [ ] Set up monitoring and logging
5. [ ] Configure automated backups
6. [ ] Set up SSL certificate
7. [ ] Test SMS and email notifications
8. [ ] Verify Google OAuth and Maps work with production URLs

---

**🔥 CRITICAL REMINDER:** 
Never commit the production `.env` file to version control! Keep production credentials secure and separate from development credentials.
