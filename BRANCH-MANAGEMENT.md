# 🌿 Branch Management - Quirofísicos Rocha

## 📋 Current Branch Structure

### 🏠 `main` Branch (Production Ready)
- **Purpose**: Stable, production-ready code
- **Status**: ✅ Deployed to Heroku
- **Live URL**: https://quirofisicos-rocha-ulises-8c6f41ba3bd0.herokuapp.com/
- **Last Update**: Complete system with user settings and Heroku deployment

### 🚧 `development` Branch (Active Development)
- **Purpose**: Ongoing development and new features
- **Status**: ✅ Ready for multi-device development
- **Current HEAD**: Enhanced .gitignore for better environment file protection
- **Features**: Development setup templates and documentation

## 🔄 Workflow Recommendations

### For Development Work:
1. **Always work on `development` branch**:
   ```bash
   git checkout development
   git pull origin development
   ```

2. **Create feature branches for major changes**:
   ```bash
   git checkout -b feature/new-feature-name
   ```

3. **Merge back to development**:
   ```bash
   git checkout development
   git merge feature/new-feature-name
   git push origin development
   ```

4. **Deploy to production**:
   ```bash
   git checkout main
   git merge development
   git push origin main
   git push heroku main  # Deploy to Heroku
   ```

## 🖥️ Multi-Device Setup

### On New Development Machine:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ulisesd15/quirofisicosRocha.git
   cd quirofisicosRocha
   ```

2. **Switch to development branch**:
   ```bash
   git checkout development
   ```

3. **Follow development setup**:
   ```bash
   # Install dependencies
   npm install
   
   # Copy environment template
   copy .env.development .env
   
   # Edit .env with your local settings
   # Create database and run setup
   node scripts/setup-db.js
   
   # Start development server
   npm run dev
   ```

## 📁 Environment Files Setup

### Development Environment:
- File: `.env` (create from `.env.development` template)
- Database: Local MySQL
- APIs: Development/test keys
- SMS: Development mode (console logging)

### Production Environment:
- Platform: Heroku
- Database: JawsDB MySQL
- APIs: Production keys
- SMS: Live Vonage integration

## 🔐 Security Notes

✅ **Protected Files** (automatically ignored by git):
- `.env` - Local development environment
- `.env.production` - Production secrets
- `.env.development` - Template only (safe to commit)
- `node_modules/` - Dependencies

✅ **Safe to Commit**:
- `.env.development` - Template with placeholders
- `.env.example` - Example configuration
- All documentation files
- All source code files

## 🚀 Quick Commands

### Development:
```bash
# Start development server
npm run dev

# Run tests
node test-sms.js
node SYSTEM-STATUS-REPORT.js

# Database setup
node scripts/setup-db.js
```

### Git Operations:
```bash
# Switch to development
git checkout development

# Get latest changes
git pull origin development

# Push your changes
git add .
git commit -m "Your changes"
git push origin development

# Deploy to production
git checkout main
git merge development
git push origin main
git push heroku main
```

## 🎯 Current Status

✅ **Ready for Multi-Device Development**
- Development branch created and pushed
- Environment templates configured
- Complete setup documentation available
- All features functional and tested

✅ **Production Deployment Active**
- Heroku app running: https://quirofisicos-rocha-ulises-8c6f41ba3bd0.herokuapp.com/
- Database configured with JawsDB MySQL
- All production features working

## 📚 Next Steps

1. **On your new device**: Clone repo and checkout development branch
2. **Setup local environment**: Follow DEVELOPMENT-SETUP.md
3. **Start developing**: Use development branch for all new work
4. **Deploy when ready**: Merge to main and push to Heroku

Happy coding across all your devices! 🌟
