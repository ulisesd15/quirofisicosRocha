# 🏥 Quirofísicos Rocha - Development Setup

## 🚀 Quick Start for New Development Environment

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/ulisesd15/quirofisicosRocha.git
cd quirofisicosRocha
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
1. Create MySQL database:
```sql
CREATE DATABASE appointments_db;
```

2. Run database setup:
```bash
node scripts/setup-db.js
```

### 4. Environment Configuration
1. Copy the development environment template:
```bash
copy .env.development .env
```

2. Edit `.env` file with your local settings:
- Update `DB_PASSWORD` with your MySQL password
- Add your Google OAuth credentials (optional for basic testing)
- Add your Google Maps API key (optional)
- Add your Vonage SMS credentials (optional)

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at: http://localhost:3001

### 🔧 Development Features

#### Admin Interface
- URL: http://localhost:3001/admin/adminOptions.html
- Default admin login:
  - Email: `admin@quirofisicosrocha.com`
  - Password: `admin123`

#### User Features
- Appointment booking: http://localhost:3001/
- User registration/login
- User settings: http://localhost:3001/user-settings.html

#### API Endpoints
- Authentication: `/api/auth/*`
- Appointments: `/api/appointments/*`
- Admin functions: `/api/admin/*`
- Business hours: `/api/admin/schedule/*`

### 📱 SMS Development Mode
The SMS service runs in development mode by default:
- SMS messages are logged to console instead of being sent
- Phone number formatting is still tested
- All SMS functions work without requiring API credentials

### 🧪 Testing
Run individual test files:
```bash
node test-sms.js          # Test SMS functionality
node test-schedule.js     # Test scheduling features
node test-complete-system.js  # Full system test
```

### 🔐 Authentication Testing
- Google OAuth works with proper credentials
- JWT-based session management
- Protected admin routes

### 📊 System Status
Run the system status report:
```bash
node SYSTEM-STATUS-REPORT.js
```

### 🚀 Production Deployment
See `HEROKU-DEPLOYMENT.md` for complete Heroku deployment instructions.

### 🆘 Troubleshooting

#### Database Connection Issues
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database exists: `appointments_db`

#### Port Already in Use
- Change PORT in `.env` file
- Or kill existing process: `npx kill-port 3001`

#### Missing Dependencies
```bash
npm install
```

### 📁 Project Structure
```
quirofisicosRocha/
├── admin/                 # Admin interface
├── config/               # Database and app configuration
├── controllers/          # Business logic
├── db/                   # Database schemas and seeds
├── middleware/           # Authentication middleware
├── models/               # Database models
├── public/               # Frontend files
├── routes/               # API routes
├── scripts/              # Setup and utility scripts
├── services/             # External services (SMS, etc.)
└── server.js            # Main application entry point
```

### 🎯 Key Features Implemented
- ✅ Complete appointment management system
- ✅ User authentication with Google OAuth
- ✅ Admin dashboard with business hours management
- ✅ SMS notifications (Vonage integration)
- ✅ Responsive design with Bootstrap 5
- ✅ User settings and profile management
- ✅ Schedule exceptions and closure days
- ✅ Yearly recurring closure days
- ✅ Production-ready deployment configuration

## 🌟 Happy Coding!
