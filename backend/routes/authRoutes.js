// backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();

const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { User } = require('../models');
const authenticateToken = require('../middleware/authenticateToken');

const JWT_SECRET = process.env.JWT_SECRET;

const FRONTEND_URL = (
  process.env.FRONTEND_URL || 'http://localhost:5173'
).replace(/\/$/, '');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required in backend/.env');
}

/**
 * GET /api/auth/profile
 * Returns the authenticated user profile.
 */
router.get('/profile', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        'id',
        'fullName',
        'email',
        'phone',
        'role',
        'authProvider',
        'isVerified',
        'createdAt',
      ],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ error: 'Database error' });
  }
});

/**
 * GET /api/auth/google
 * Begins Google OAuth.
 */
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * GET /api/auth/google/callback
 * Receives Google OAuth callback and redirects to React with JWT.
 */
router.get('/google/callback',(req, res, next) => {
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${FRONTEND_URL}/login?error=oauthFailed`,
    })(req, res, next);
  },

  (req, res) => {
    try {
      const token = req.user?.token;

      if (!token) {
        console.error('Google OAuth succeeded but req.user.token is missing.');

        return res.redirect(
          `${FRONTEND_URL}/login?error=oauthFailed`
        );
      }

      return res.redirect(
        `${FRONTEND_URL}/auth-success?token=${encodeURIComponent(token)}`
      );
    } catch (error) {
      console.error('Error completing Google OAuth callback:', error);

      return res.redirect(
        `${FRONTEND_URL}/login?error=oauthFailed`
      );
    }
  },

  (error, req, res, next) => {
    console.error('Google OAuth middleware error:', error);

    return res.redirect(
      `${FRONTEND_URL}/login?error=oauthFailed`
    );
  }
);

/**
 * POST /api/auth/login
 * Authenticates a local user and returns a JWT.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Esta cuenta usa inicio de sesión con Google.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
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

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role || 'user',
        authProvider: user.authProvider || 'local',
      },
      token,
    });
  } catch (error) {
    console.error('Database error during login:', error);

    return res.status(500).json({
      success: false,
      message: 'Error del servidor',
    });
  }
});

/**
 * POST /api/auth/register
 * Creates a local user and returns a JWT.
 */
router.post('/register', async (req, res) => {
  const { fullName, phone, email, password } = req.body;

  if (!fullName || !phone || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Faltan campos requeridos',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña debe tener al menos 6 caracteres',
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: 'user',
      authProvider: 'local',
    });

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role || 'user',
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        phone: newUser.phone,
        role: newUser.role || 'user',
        authProvider: newUser.authProvider || 'local',
      },
      token,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'El correo ya está registrado',
      });
    }

    console.error('Error al registrar el usuario:', error);

    return res.status(500).json({
      success: false,
      message: 'Error al registrar el usuario',
    });
  }
});

/**
 * PUT /api/auth/change-password
 * Changes the password of an authenticated local-account user.
 */
router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: 'Todos los campos son requeridos.',
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 6 caracteres.',
    });
  }

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado.',
      });
    }

    if (user.authProvider !== 'local') {
      return res.status(400).json({
        error: 'No se puede cambiar la contraseña para cuentas de Google.',
      });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        error: 'La contraseña actual es incorrecta.',
      });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update({
      password: newHashedPassword,
    });

    return res.json({
      message: 'Contraseña actualizada correctamente.',
    });
  } catch (error) {
    console.error('Error updating password:', error);

    return res.status(500).json({
      error: 'Error del servidor.',
    });
  }
});

module.exports = router;