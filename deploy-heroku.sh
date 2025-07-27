#!/bin/bash

# Heroku Deployment Script for Quirofísicos Rocha
# This script automates the Heroku deployment process

echo "🚀 Starting Heroku Deployment for Quirofísicos Rocha"
echo "=================================================="

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed. Please install it first:"
    echo "   Windows: winget install Heroku.CLI"
    echo "   Or download from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "🔐 Please login to Heroku:"
    heroku login
fi

# Get app name
read -p "Enter your Heroku app name (or press Enter to create a new one): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "📱 Creating new Heroku app..."
    heroku create
    APP_NAME=$(heroku apps:info --json | jq -r '.name')
    echo "✅ Created app: $APP_NAME"
else
    echo "📱 Using existing app: $APP_NAME"
    heroku git:remote -a $APP_NAME
fi

# Add JawsDB MySQL add-on
echo "🗄️ Adding JawsDB MySQL add-on..."
heroku addons:create jawsdb:kitefin -a $APP_NAME || echo "⚠️ JawsDB addon might already exist"

# Set environment variables
echo "⚙️ Setting environment variables..."

heroku config:set NODE_ENV=production -a $APP_NAME

# Generate secret key
SECRET_KEY=$(openssl rand -hex 64 2>/dev/null || echo "your_production_secret_key_change_this_64_chars_minimum")
heroku config:set SECRET_KEY=$SECRET_KEY -a $APP_NAME

# Google OAuth
heroku config:set GOOGLE_CLIENT_ID=your-google-client-id -a $APP_NAME
heroku config:set GOOGLE_CLIENT_SECRET=your-google-client-secret -a $APP_NAME
heroku config:set GOOGLE_CALLBACK_URL=https://$APP_NAME.herokuapp.com/api/auth/google/callback -a $APP_NAME

# Google Maps
heroku config:set GOOGLE_MAPS_API_KEY=your-google-maps-api-key -a $APP_NAME

# Vonage SMS
heroku config:set VONAGE_API_KEY=your-vonage-api-key -a $APP_NAME
heroku config:set VONAGE_API_SECRET=your-vonage-api-secret -a $APP_NAME
heroku config:set VONAGE_FROM_NUMBER=your-vonage-phone-number -a $APP_NAME

# Security
heroku config:set TRUSTED_ORIGINS=https://$APP_NAME.herokuapp.com -a $APP_NAME

echo "✅ Environment variables set!"

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - Quirofísicos Rocha"
fi

# Deploy to Heroku
echo "🚀 Deploying to Heroku..."
git add .
git commit -m "Deploy to Heroku - $(date)"
git push heroku main

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is available at: https://$APP_NAME.herokuapp.com"
echo "🔐 Default admin login: admin@quirofisicosrocha.com / admin123"
echo "⚠️ IMPORTANT: Change the admin password immediately after deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Update Google OAuth redirect URI in Google Cloud Console"
echo "2. Test all functionality"
echo "3. Change admin password"
echo "4. Monitor with: heroku logs --tail -a $APP_NAME"
echo ""
echo "🎉 Deployment successful!"
