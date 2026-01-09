const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const List = require('../models/List');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Create default lists for new user
const createDefaultLists = async (userId) => {
  const defaultLists = [
    { name: 'Inbox', icon: 'inbox', color: '#1890ff', isDefault: true, isSmart: false },
    { name: 'Today', icon: 'calendar', color: '#52c41a', isDefault: true, isSmart: true, 
      smartFilter: { dueDate: 'today' } },
    { name: 'Next 7 Days', icon: 'calendar-week', color: '#faad14', isDefault: true, isSmart: true,
      smartFilter: { dueDate: 'next7days' } },
    { name: 'All', icon: 'list', color: '#722ed1', isDefault: true, isSmart: true,
      smartFilter: { status: 'active' } },
    { name: 'Completed', icon: 'check-circle', color: '#13c2c2', isDefault: true, isSmart: true,
      smartFilter: { status: 'completed' } }
  ];

  await List.insertMany(defaultLists.map((list, index) => ({
    ...list,
    user: userId,
    order: index
  })));
};

// Register with email/password
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: { message: 'Email already registered' } });
      }

      // Create user
      const user = new User({
        email: email.toLowerCase(),
        password,
        name
      });

      await user.save();

      // Create default lists
      await createDefaultLists(user._id);

      // Generate token
      const token = generateToken(user);

      res.status(201).json({
        token,
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: { message: 'Registration failed' } });
    }
  }
);

// Login with email/password
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          return res.status(401).json({ error: { message: info.message || 'Authentication failed' } });
        }

        const token = generateToken(user);

        res.json({
          token,
          user: user.toJSON()
        });
      })(req, res, next);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: { message: 'Login failed' } });
    }
  }
);

// Google OAuth - Initiate
router.get('/google',
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar'
    ],
    accessType: 'offline',
    prompt: 'consent'
  })
);

// Google OAuth - Callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const user = req.user;

      // Check if user has default lists, create if not
      const listsCount = await List.countDocuments({ user: user._id });
      if (listsCount === 0) {
        await createDefaultLists(user._id);
      }

      const token = generateToken(user);

      // Redirect to frontend with token
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(`${clientUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }
  }
);

// Get current user
router.get('/me',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json({ user: req.user.toJSON() });
  }
);

// Update user profile
router.put('/profile',
  passport.authenticate('jwt', { session: false }),
  [
    body('name').optional().trim().notEmpty(),
    body('avatar').optional().isURL()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, avatar } = req.body;
      const user = req.user;

      if (name) user.name = name;
      if (avatar) user.avatar = avatar;

      await user.save();

      res.json({ user: user.toJSON() });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: { message: 'Profile update failed' } });
    }
  }
);

// Disconnect Google account
router.post('/disconnect-google',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;
      
      user.googleAccessToken = null;
      user.googleRefreshToken = null;
      
      await user.save();

      res.json({ message: 'Google account disconnected successfully' });
    } catch (error) {
      console.error('Disconnect Google error:', error);
      res.status(500).json({ error: { message: 'Failed to disconnect Google account' } });
    }
  }
);

module.exports = router;

