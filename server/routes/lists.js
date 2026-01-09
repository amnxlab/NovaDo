const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const List = require('../models/List');
const Task = require('../models/Task');

const auth = passport.authenticate('jwt', { session: false });

// Get all lists for user
router.get('/', auth, async (req, res) => {
  try {
    const lists = await List.find({
      user: req.user._id,
      isArchived: false
    }).sort({ order: 1, createdAt: 1 });
    
    // Get task counts for each list
    const listsWithCounts = await Promise.all(
      lists.map(async (list) => {
        const taskCount = await Task.countDocuments({
          list: list._id,
          status: 'active'
        });
        
        return {
          ...list.toObject(),
          taskCount
        };
      })
    );
    
    res.json({ lists: listsWithCounts });
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch lists' } });
  }
});

// Get single list
router.get('/:id', auth, async (req, res) => {
  try {
    const list = await List.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!list) {
      return res.status(404).json({ error: { message: 'List not found' } });
    }
    
    res.json({ list });
  } catch (error) {
    console.error('Get list error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch list' } });
  }
});

// Create list
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
      
      const list = new List({
        ...req.body,
        user: req.user._id
      });
      
      await list.save();
      
      // Emit socket event
      const io = req.app.get('io');
      io.to(`user:${req.user._id}`).emit('list:created', list);
      
      res.status(201).json({ list });
    } catch (error) {
      console.error('Create list error:', error);
      res.status(500).json({ error: { message: 'Failed to create list' } });
    }
  }
);

// Update list
router.put('/:id', auth, async (req, res) => {
  try {
    const list = await List.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!list) {
      return res.status(404).json({ error: { message: 'List not found' } });
    }
    
    // Prevent updating default lists' core properties
    if (list.isDefault) {
      const allowedUpdates = ['color', 'order'];
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          list[key] = req.body[key];
        }
      });
    } else {
      Object.keys(req.body).forEach(key => {
        if (key !== '_id' && key !== 'user') {
          list[key] = req.body[key];
        }
      });
    }
    
    await list.save();
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`user:${req.user._id}`).emit('list:updated', list);
    
    res.json({ list });
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({ error: { message: 'Failed to update list' } });
  }
});

// Delete list
router.delete('/:id', auth, async (req, res) => {
  try {
    const list = await List.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!list) {
      return res.status(404).json({ error: { message: 'List not found' } });
    }
    
    // Prevent deleting default lists
    if (list.isDefault) {
      return res.status(400).json({ error: { message: 'Cannot delete default lists' } });
    }
    
    // Move tasks to inbox
    const inboxList = await List.findOne({
      user: req.user._id,
      name: 'Inbox'
    });
    
    if (inboxList) {
      await Task.updateMany(
        { list: list._id },
        { $set: { list: inboxList._id } }
      );
    }
    
    await list.deleteOne();
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`user:${req.user._id}`).emit('list:deleted', { id: list._id });
    
    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({ error: { message: 'Failed to delete list' } });
  }
});

// Reorder lists
router.patch('/reorder', auth, async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, order }
    
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: { message: 'Invalid orders format' } });
    }
    
    const bulkOps = orders.map(item => ({
      updateOne: {
        filter: { _id: item.id, user: req.user._id },
        update: { $set: { order: item.order } }
      }
    }));
    
    await List.bulkWrite(bulkOps);
    
    res.json({ message: 'Lists reordered successfully' });
  } catch (error) {
    console.error('Reorder lists error:', error);
    res.status(500).json({ error: { message: 'Failed to reorder lists' } });
  }
});

module.exports = router;

