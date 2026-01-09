const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const List = require('../models/List');
const multer = require('multer');
const path = require('path');

// Authentication middleware
const auth = passport.authenticate('jwt', { session: false });

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  }
});

// Get all tasks for user
router.get('/', auth, async (req, res) => {
  try {
    const { list, status, priority, tag, search, dueDate } = req.query;
    
    const query = { user: req.user._id };
    
    if (list) query.list = list;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (tag) query.tags = tag;
    
    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate === 'today') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        query.dueDate = { $gte: today, $lt: tomorrow };
      } else if (dueDate === 'next7days') {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        query.dueDate = { $gte: today, $lte: nextWeek };
      } else if (dueDate === 'overdue') {
        query.dueDate = { $lt: today };
        query.status = 'active';
      }
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    const tasks = await Task.find(query)
      .populate('list', 'name color icon')
      .sort({ order: 1, createdAt: -1 });
    
    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch tasks' } });
  }
});

// Get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('list', 'name color icon');
    
    if (!task) {
      return res.status(404).json({ error: { message: 'Task not found' } });
    }
    
    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch task' } });
  }
});

// Create task
router.post('/',
  auth,
  [
    body('title').trim().notEmpty(),
    body('list').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      // Verify list belongs to user
      const list = await List.findOne({
        _id: req.body.list,
        user: req.user._id
      });
      
      if (!list) {
        return res.status(404).json({ error: { message: 'List not found' } });
      }
      
      const task = new Task({
        ...req.body,
        user: req.user._id
      });
      
      await task.save();
      await task.populate('list', 'name color icon');
      
      // Emit socket event
      const io = req.app.get('io');
      io.to(`user:${req.user._id}`).emit('task:created', task);
      
      res.status(201).json({ task });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ error: { message: 'Failed to create task' } });
    }
  }
);

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!task) {
      return res.status(404).json({ error: { message: 'Task not found' } });
    }
    
    // If list is being changed, verify it belongs to user
    if (req.body.list && req.body.list !== task.list.toString()) {
      const list = await List.findOne({
        _id: req.body.list,
        user: req.user._id
      });
      
      if (!list) {
        return res.status(404).json({ error: { message: 'List not found' } });
      }
    }
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'user') {
        task[key] = req.body[key];
      }
    });
    
    // If marking as completed, set completedAt
    if (req.body.status === 'completed' && task.status !== 'completed') {
      task.completedAt = new Date();
      
      // Update user stats
      req.user.stats.totalTasksCompleted += 1;
      await req.user.save();
    }
    
    await task.save();
    await task.populate('list', 'name color icon');
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`user:${req.user._id}`).emit('task:updated', task);
    
    res.json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: { message: 'Failed to update task' } });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!task) {
      return res.status(404).json({ error: { message: 'Task not found' } });
    }
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`user:${req.user._id}`).emit('task:deleted', { id: task._id });
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: { message: 'Failed to delete task' } });
  }
});

// Upload attachment
router.post('/:id/attachments',
  auth,
  upload.single('file'),
  async (req, res) => {
    try {
      const task = await Task.findOne({
        _id: req.params.id,
        user: req.user._id
      });
      
      if (!task) {
        return res.status(404).json({ error: { message: 'Task not found' } });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: { message: 'No file uploaded' } });
      }
      
      const attachment = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`
      };
      
      task.attachments.push(attachment);
      await task.save();
      
      res.json({ attachment });
    } catch (error) {
      console.error('Upload attachment error:', error);
      res.status(500).json({ error: { message: 'Failed to upload attachment' } });
    }
  }
);

// Bulk update (for drag-and-drop reordering)
router.patch('/bulk-update', auth, async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, order, list }
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: { message: 'Invalid updates format' } });
    }
    
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update.id, user: req.user._id },
        update: { $set: { order: update.order, ...(update.list && { list: update.list }) } }
      }
    }));
    
    await Task.bulkWrite(bulkOps);
    
    res.json({ message: 'Tasks updated successfully' });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: { message: 'Failed to update tasks' } });
  }
});

// Get task statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [totalActive, completedToday, overdue, upcoming] = await Promise.all([
      Task.countDocuments({ user: req.user._id, status: 'active' }),
      Task.countDocuments({
        user: req.user._id,
        status: 'completed',
        completedAt: { $gte: today }
      }),
      Task.countDocuments({
        user: req.user._id,
        status: 'active',
        dueDate: { $lt: today }
      }),
      Task.countDocuments({
        user: req.user._id,
        status: 'active',
        dueDate: { $gte: today, $lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) }
      })
    ]);
    
    res.json({
      stats: {
        totalActive,
        completedToday,
        overdue,
        upcoming
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch statistics' } });
  }
});

module.exports = router;

