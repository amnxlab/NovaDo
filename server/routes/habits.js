const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const Habit = require('../models/Habit');

const auth = passport.authenticate('jwt', { session: false });

// Get all habits for user
router.get('/', auth, async (req, res) => {
  try {
    const { isActive } = req.query;
    
    const query = { user: req.user._id, isArchived: false };
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const habits = await Habit.find(query).sort({ createdAt: -1 });
    
    res.json({ habits });
  } catch (error) {
    console.error('Get habits error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch habits' } });
  }
});

// Get single habit
router.get('/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!habit) {
      return res.status(404).json({ error: { message: 'Habit not found' } });
    }
    
    res.json({ habit });
  } catch (error) {
    console.error('Get habit error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch habit' } });
  }
});

// Create habit
router.post('/',
  auth,
  [
    body('name').trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const habit = new Habit({
        ...req.body,
        user: req.user._id
      });
      
      await habit.save();
      
      res.status(201).json({ habit });
    } catch (error) {
      console.error('Create habit error:', error);
      res.status(500).json({ error: { message: 'Failed to create habit' } });
    }
  }
);

// Update habit
router.put('/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!habit) {
      return res.status(404).json({ error: { message: 'Habit not found' } });
    }
    
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'user' && key !== 'completions') {
        habit[key] = req.body[key];
      }
    });
    
    await habit.save();
    
    res.json({ habit });
  } catch (error) {
    console.error('Update habit error:', error);
    res.status(500).json({ error: { message: 'Failed to update habit' } });
  }
});

// Delete habit
router.delete('/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!habit) {
      return res.status(404).json({ error: { message: 'Habit not found' } });
    }
    
    res.json({ message: 'Habit deleted successfully' });
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({ error: { message: 'Failed to delete habit' } });
  }
});

// Mark habit as completed for a date
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { date, count = 1, note } = req.body;
    
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!habit) {
      return res.status(404).json({ error: { message: 'Habit not found' } });
    }
    
    const completionDate = date ? new Date(date) : new Date();
    completionDate.setHours(0, 0, 0, 0);
    
    // Check if already completed for this date
    const existingIndex = habit.completions.findIndex(c => {
      const cDate = new Date(c.date);
      cDate.setHours(0, 0, 0, 0);
      return cDate.getTime() === completionDate.getTime();
    });
    
    if (existingIndex >= 0) {
      habit.completions[existingIndex].count += count;
      if (note) habit.completions[existingIndex].note = note;
    } else {
      habit.completions.push({
        date: completionDate,
        count,
        note
      });
    }
    
    // Update streak
    habit.updateStreak();
    
    await habit.save();
    
    res.json({ habit });
  } catch (error) {
    console.error('Complete habit error:', error);
    res.status(500).json({ error: { message: 'Failed to complete habit' } });
  }
});

// Uncomplete habit for a date
router.post('/:id/uncomplete', auth, async (req, res) => {
  try {
    const { date } = req.body;
    
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!habit) {
      return res.status(404).json({ error: { message: 'Habit not found' } });
    }
    
    const completionDate = date ? new Date(date) : new Date();
    completionDate.setHours(0, 0, 0, 0);
    
    habit.completions = habit.completions.filter(c => {
      const cDate = new Date(c.date);
      cDate.setHours(0, 0, 0, 0);
      return cDate.getTime() !== completionDate.getTime();
    });
    
    // Update streak
    habit.updateStreak();
    
    await habit.save();
    
    res.json({ habit });
  } catch (error) {
    console.error('Uncomplete habit error:', error);
    res.status(500).json({ error: { message: 'Failed to uncomplete habit' } });
  }
});

// Get habit statistics
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!habit) {
      return res.status(404).json({ error: { message: 'Habit not found' } });
    }
    
    const totalCompletions = habit.completions.reduce((sum, c) => sum + c.count, 0);
    const daysTracked = habit.completions.length;
    
    // Calculate completion rate
    const daysSinceStart = Math.floor((Date.now() - habit.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const completionRate = daysSinceStart > 0 ? (daysTracked / daysSinceStart) * 100 : 0;
    
    res.json({
      stats: {
        totalCompletions,
        daysTracked,
        currentStreak: habit.currentStreak,
        longestStreak: habit.longestStreak,
        completionRate: Math.round(completionRate)
      }
    });
  } catch (error) {
    console.error('Get habit stats error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch habit statistics' } });
  }
});

module.exports = router;

