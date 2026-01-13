const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { Op } = require('sequelize');
const secretKey = process.env.SECRET_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

// Debug logging
console.log('🔍 Passport Google Strategy Config:', {
  clientID: process.env.GOOGLE_CLIENT_ID ? 'Set (' + process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...)' : 'NOT SET',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'NOT SET',
  callbackURL: process.env.GOOGLE_CALLBACK_URL
});

// Only configure Google OAuth if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
  console.log('🎯 Google OAuth callback received:', {
    email: profile.emails[0].value,
    name: profile.displayName,
    id: profile.id
  });

  const email = profile.emails[0].value;
  const fullName = profile.displayName; // Use camelCase to match the model attribute
  const googleId = profile.id;

  try {
    // First check by google_id, then by email
    let user = await User.findOne({
      where: {
        [Op.or]: [
          { googleId: googleId },
          { email: email }
        ]
      }
    });

    if (user) {
      // If user exists but doesn't have googleId, update it
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        await user.save();
      }
      
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
      return done(null, { token });
    }

    // New Google user -> insert into users table
    const newUser = await User.create({
      fullName, // Pass the camelCase variable here
      email,
      authProvider: 'google',
      googleId,
      role: 'user'
    });

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '2h' });
    return done(null, { token });
  } catch (err) {
    console.error('Database error during Google OAuth:', err);
    return done(err);
  }
}));

} else {
  console.log('⚠️ Google OAuth not configured - only local authentication available');
}
