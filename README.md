# Quirofísicos Rocha - Appointment Booking System

A complete web application for managing chiropractic appointments with dual calendar views, admin panel, and business hours management.

## 🌟 Features

### For Patients
- **Dual Calendar Views**: Choose between compact weekly view and full monthly calendar
- **Smart Availability**: Real-time slot checking based on admin-configured business hours
- **Guest & User Booking**: Book appointments as a guest or registered user
- **Responsive Design**: Mobile-first approach with Bootstrap 5
- **AM/PM Time Format**: User-friendly 12-hour time display
- **Google OAuth**: Quick login with Google account

### For Administrators
- **Business Hours Management**: Configure opening/closing times and breaks for each day
- **Real-time Preview**: See available time slots for any date
- **Statistics Dashboard**: View appointment counts and business metrics
- **User Management**: Handle user accounts and appointments
- **Secure Authentication**: JWT-based admin authentication

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL database
- Google OAuth credentials (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quirofisicosRocha
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy `.env.example` to `.env` and fill in your actual values:
   ```bash
   cp .env.example .env
   ```
   
   **Required Environment Variables:**
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your-mysql-password
   DB_NAME=appointments_db
   
   # Security & Authentication
   SECRET_KEY=your-jwt-secret-key-here
   JWT_SECRET=your-jwt-secret-key-here
   SESSION_SECRET=your-session-secret-key-here
   
   # Google Services (Optional but recommended)
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   
   # SMS Service (Vonage/Nexmo) - For appointment notifications
   VONAGE_API_KEY=your-vonage-api-key
   VONAGE_API_SECRET=your-vonage-api-secret
   VONAGE_FROM_NUMBER=your-vonage-phone-number
   
   # Admin Settings
   ADMIN_PHONE_NUMBER=+526641234567
   
   # Application Settings
   PORT=3001
   NODE_ENV=development
   WEBSITE_URL=http://localhost:3001
   ```
   
   **🔒 Security Note:** Never commit your `.env` file to version control! It contains sensitive API keys and passwords.

4. **Set up the database**
   ```bash
   # Create database and tables
   mysql -u root -p < db/schema.sql
   
   # Insert sample data
   mysql -u root -p < db/seeds.sql
   ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   - Main site: http://localhost:3001
   - Admin panel: http://localhost:3001/admin/schedule.html
   - Admin credentials: admin@quirofisicosrocha.com / Password123!

## 📁 Project Structure

```
quirofisicosRocha/
├── admin/                          # Admin panel files
│   ├── adminOptions.html           # Main admin dashboard
│   ├── schedule.html               # Business hours management
│   ├── css/                        # Admin-specific styles
│   └── js/                         # Admin JavaScript files
├── config/                         # Configuration files
│   ├── connections.js              # Database connection
│   ├── passport.js                 # Google OAuth configuration
│   └── sequelize.js               # Sequelize ORM setup
├── controllers/                    # Business logic
│   ├── authController.js          # Authentication logic
│   └── scheduleController.js      # Schedule & appointment logic
├── db/                            # Database files
│   ├── schema.sql                 # Database schema
│   ├── seeds.sql                  # Sample data
│   └── *.sql                      # Additional schemas
├── middleware/                     # Express middleware
│   └── auth.js                    # JWT authentication
├── models/                        # Sequelize models (optional)
├── public/                        # Frontend files
│   ├── *.html                     # Main pages
│   ├── css/                       # Stylesheets
│   │   ├── appointment-mobile.css # Week view calendar styles
│   │   └── monthly-calendar.css   # Month view calendar styles
│   ├── js/                        # JavaScript files
│   │   ├── appointment.js         # Main appointment booking
│   │   ├── enhanced-calendar.js   # Monthly calendar system
│   │   ├── auth.js               # Authentication manager
│   │   └── navigation.js         # Navigation component
│   └── img/                       # Images
├── routes/                        # API routes
│   ├── apiRoutes.js              # Public API endpoints
│   ├── authRoutes.js             # Authentication routes
│   └── adminRoutes.js            # Admin API endpoints
├── package.json                   # Dependencies and scripts
├── server.js                     # Express server
└── README.md                     # This file
```

## 🔧 Key Technologies

- **Backend**: Node.js, Express.js, MySQL
- **Frontend**: HTML5, CSS3, JavaScript ES6+, Bootstrap 5
- **Authentication**: JWT, Google OAuth 2.0, bcrypt
- **Calendar System**: Custom JavaScript with dual view support
- **Database**: MySQL with connection pooling
- **Security**: CORS, helmet, input validation

## 📅 Calendar System

### Week View
- Ultra-slim 7-day horizontal scrolling calendar
- Mobile-optimized with touch-friendly buttons
- Real-time availability checking
- AM/PM time slot display

### Month View
- Full month grid similar to Google Calendar
- Next available date navigation
- Color-coded availability indicators
- Responsive design for all screen sizes

## 🔐 Admin Features

### Business Hours Management
- Configure opening/closing times for each day of the week
- Set lunch breaks and special hours
- Real-time preview of available time slots
- Bulk save operations

### Statistics Dashboard
- Total open days per week
- Weekly appointment counts
- Pending appointment tracking
- Business hours summary

## 🛡️ Security Features

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection prevention
- XSS protection
- CORS configuration
- Admin role verification

## 🎨 Responsive Design

- Mobile-first approach
- Bootstrap 5 framework
- Custom CSS for calendar components
- Touch-friendly interface
- Optimized for all device sizes

## 📊 Database Schema

### Main Tables
- `users` - User accounts and authentication
- `appointments` - Appointment bookings
- `business_hours` - Admin-configured working hours
- `clinic_settings` - General clinic configuration

### Enhanced Features (Optional)
- `scheduled_closures` - Holiday and vacation management
- `blocked_time_slots` - Specific time restrictions
- `announcements` - Site-wide announcements

## 🌐 API Endpoints

### Public Endpoints
- `GET /api/business-hours` - Get business hours
- `GET /api/available-slots/:date` - Get available time slots
- `POST /api/appointments` - Create appointment (guest/user)
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Admin Endpoints
- `GET /api/admin/schedule/business-hours` - Get business hours
- `PUT /api/admin/schedule/business-hours/:day` - Update business hours
- `GET /api/admin/schedule/stats` - Get statistics
- `GET /api/admin/appointments` - Manage appointments

## 🚀 Deployment

### Environment Setup
1. Configure production environment variables
2. Set up MySQL database
3. Configure reverse proxy (nginx recommended)
4. Set up SSL certificates
5. Configure Google OAuth for production domain

### Production Considerations
- Use environment variables for all secrets
- Enable database connection pooling
- Configure proper logging
- Set up database backups
- Monitor performance metrics

## 📝 License

This project is proprietary software for Quirofísicos Rocha.

## 🤝 Contributing

This is a private project. For modifications or updates, please contact the development team.

## 📞 Support

For technical support or questions about the appointment system, please contact the administrator.

---

**Developed for Quirofísicos Rocha - Professional Chiropractic Services**