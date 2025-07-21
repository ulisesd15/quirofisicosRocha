# Quirofísicos Rocha - Appointment System

A comprehensive appointment booking system with dual authentication (traditional login and Google OAuth).

## Features

### Authentication System
- **Traditional Registration/Login**: Users can create accounts with email and password
- **Google OAuth Integration**: Users can sign in with their Google accounts
- **Hybrid User Management**: Single users table handles both authentication methods
- **JWT Token Authentication**: Secure API access with JSON Web Tokens

### User Management
- User profiles with phone and personal information
- Password change functionality (for traditional users)
- Profile updates
- Authentication provider tracking

### Appointment System
- Guest appointment booking (no registration required)
- Registered user appointment booking
- Admin appointment management

## Setup Instructions

### 1. Environment Configuration
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

### 2. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3001/api/auth/google/callback`
5. Copy Client ID and Client Secret to your `.env` file

### 3. Database Setup
```bash
# Create and seed the database
mysql -u root -p < db/schema.sql
mysql -u root -p appointments_db < db/seeds.sql
```

### 4. Install Dependencies and Run
```bash
npm install
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Traditional login
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/profile` - Get user profile (requires auth)
- `PUT /api/auth/profile` - Update user profile (requires auth)
- `PUT /api/auth/change-password` - Change password (requires auth, local users only)

### Database Schema

#### Users Table
- **id**: Primary key
- **full_name**: User's full name
- **email**: Unique email address
- **phone**: Phone number (optional for OAuth users)
- **password**: Hashed password (null for OAuth users)
- **auth_provider**: 'local' or 'google'
- **google_id**: Google user ID (for OAuth users)
- **created_at/updated_at**: Timestamps

This design allows the same table to handle both traditional and OAuth users seamlessly.