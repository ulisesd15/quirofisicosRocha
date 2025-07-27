@echo off
echo 🚀 Starting Heroku Deployment for Quirofísicos Rocha
echo ==================================================

REM Check if Heroku CLI is installed
where heroku >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Heroku CLI is not installed. Please install it first:
    echo    Windows: winget install Heroku.CLI
    echo    Or download from: https://devcenter.heroku.com/articles/heroku-cli
    pause
    exit /b 1
)

REM Check if logged in to Heroku
heroku auth:whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 🔐 Please login to Heroku:
    heroku login
)

REM Get app name
set /p APP_NAME="Enter your Heroku app name (or press Enter to create a new one): "

if "%APP_NAME%"=="" (
    echo 📱 Creating new Heroku app...
    heroku create
    REM You'll need to manually get the app name from the output
    echo ⚠️ Please note the app name from above and run this script again with that name
    pause
    exit /b 0
) else (
    echo 📱 Using existing app: %APP_NAME%
    heroku git:remote -a %APP_NAME%
)

REM Add JawsDB MySQL add-on
echo 🗄️ Adding JawsDB MySQL add-on...
heroku addons:create jawsdb:kitefin -a %APP_NAME%

REM Set environment variables
echo ⚙️ Setting environment variables...

heroku config:set NODE_ENV=production -a %APP_NAME%
heroku config:set SECRET_KEY=your_production_secret_key_change_this_64_chars_minimum -a %APP_NAME%
heroku config:set GOOGLE_CLIENT_ID=your-google-client-id -a %APP_NAME%
heroku config:set GOOGLE_CLIENT_SECRET=your-google-client-secret -a %APP_NAME%
heroku config:set GOOGLE_CALLBACK_URL=https://%APP_NAME%.herokuapp.com/api/auth/google/callback -a %APP_NAME%
heroku config:set GOOGLE_MAPS_API_KEY=your-google-maps-api-key -a %APP_NAME%
heroku config:set VONAGE_API_KEY=your-vonage-api-key -a %APP_NAME%
heroku config:set VONAGE_API_SECRET=your-vonage-api-secret -a %APP_NAME%
heroku config:set VONAGE_FROM_NUMBER=your-vonage-phone-number -a %APP_NAME%
heroku config:set TRUSTED_ORIGINS=https://%APP_NAME%.herokuapp.com -a %APP_NAME%

echo ✅ Environment variables set!

REM Initialize git if needed
if not exist ".git" (
    echo 📦 Initializing git repository...
    git init
    git add .
    git commit -m "Initial commit - Quirofísicos Rocha"
)

REM Deploy to Heroku
echo 🚀 Deploying to Heroku...
git add .
git commit -m "Deploy to Heroku"
git push heroku main

echo ✅ Deployment complete!
echo.
echo 🌐 Your app is available at: https://%APP_NAME%.herokuapp.com
echo 🔐 Default admin login: admin@quirofisicosrocha.com / admin123
echo ⚠️ IMPORTANT: Change the admin password immediately after deployment!
echo.
echo 📋 Next steps:
echo 1. Update Google OAuth redirect URI in Google Cloud Console
echo 2. Test all functionality
echo 3. Change admin password
echo 4. Monitor with: heroku logs --tail -a %APP_NAME%
echo.
echo 🎉 Deployment successful!
pause
