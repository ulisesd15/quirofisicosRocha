// backend/config/passport.js

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

// Avoid logging secrets. It is okay to log whether variables exist.
console.log('Passport Google Strategy Config:', {
  clientIDConfigured: Boolean(GOOGLE_CLIENT_ID),
  clientSecretConfigured: Boolean(GOOGLE_CLIENT_SECRET),
  callbackURL: GOOGLE_CALLBACK_URL || 'NOT SET',
  jwtSecretConfigured: Boolean(JWT_SECRET),
});

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required to configure Google OAuth.');
}

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.trim().toLowerCase();
          const fullName = profile.displayName?.trim() || 'Usuario de Google';
          const googleId = profile.id;

          if (!email) {
            return done(
              new Error(
                'Google no proporcionó una dirección de correo electrónico para esta cuenta.'
              )
            );
          }

          let user = await User.findOne({
            where: {
              [Op.or]: [
                { googleId },
                { email },
              ],
            },
          });

          if (user) {
            // Link a preexisting local user to Google if they share the email.
            if (!user.googleId) {
              await user.update({
                googleId,
                authProvider: 'google',
              });
            }
          } else {
            user = await User.create({
              fullName,
              email,
              authProvider: 'google',
              googleId,
              role: 'user',
            });
          }

          const token = jwt.sign(
            {
              id: user.id,
              email: user.email,
              role: user.role || 'user',
            },
            JWT_SECRET,
            { expiresIn: '2h' }
          );

          // This shape matches your current authRoutes callback:
          // const token = req.user?.token;
          return done(null, { token });
        } catch (error) {
          console.error('Database error during Google OAuth:', error);
          return done(error);
        }
      }
    )
  );

  console.log('Google OAuth Passport strategy registered.');
} else {
  console.warn(
    'Google OAuth not configured. Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL.'
  );
}

module.exports = passport;