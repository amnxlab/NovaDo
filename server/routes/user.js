const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const auth = passport.authenticate('jwt', { session: false });

// Get user preferences
router.get('/preferences', auth, async (req, res) => {
  try {
    res.json({ preferences: req.user.preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch preferences' } });
  }
});

// Update user preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({ error: { message: 'Preferences object required' } });
    }
    
    // Merge preferences
    req.user.preferences = {
      ...req.user.preferences.toObject(),
      ...preferences
    };
    
    await req.user.save();
    
    res.json({ preferences: req.user.preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: { message: 'Failed to update preferences' } });
  }
});

// Get user statistics
router.get('/stats', auth, async (req, res) => {
  try {
    res.json({ stats: req.user.stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch statistics' } });
  }
});

// Subscribe to push notifications
router.post('/push-subscription', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription) {
      return res.status(400).json({ error: { message: 'Subscription object required' } });
    }
    
    req.user.pushSubscription = subscription;
    await req.user.save();
    
    res.json({ message: 'Push subscription saved successfully' });
  } catch (error) {
    console.error('Save push subscription error:', error);
    res.status(500).json({ error: { message: 'Failed to save push subscription' } });
  }
});

// Unsubscribe from push notifications
router.delete('/push-subscription', auth, async (req, res) => {
  try {
    req.user.pushSubscription = null;
    await req.user.save();
    
    res.json({ message: 'Push subscription removed successfully' });
  } catch (error) {
    console.error('Remove push subscription error:', error);
    res.status(500).json({ error: { message: 'Failed to remove push subscription' } });
  }
});

// Change password
router.post('/change-password',
  auth,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      // Verify current password
      const isMatch = await req.user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: { message: 'Current password is incorrect' } });
      }
      
      // Update password
      req.user.password = newPassword;
      await req.user.save();
      
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: { message: 'Failed to change password' } });
    }
  }
);

// Delete account
router.delete('/account', auth, async (req, res) => {
  try {
    const { password } = req.body;
    
    // Verify password
    if (req.user.password) {
      const isMatch = await req.user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ error: { message: 'Password is incorrect' } });
      }
    }
    
    // Delete user and all associated data
    const Task = require('../models/Task');
    const List = require('../models/List');
    const Habit = require('../models/Habit');
    
    await Promise.all([
      Task.deleteMany({ user: req.user._id }),
      List.deleteMany({ user: req.user._id }),
      Habit.deleteMany({ user: req.user._id }),
      req.user.deleteOne()
    ]);
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: { message: 'Failed to delete account' } });
  }
});

module.exports = router;

