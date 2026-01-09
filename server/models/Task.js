const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: true
  },
  
  // Date and time
  dueDate: {
    type: Date,
    default: null
  },
  dueTime: {
    type: String, // Format: "HH:mm"
    default: null
  },
  startDate: {
    type: Date,
    default: null
  },
  
  // Recurrence
  recurrence: {
    enabled: {
      type: Boolean,
      default: false
    },
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
      default: 'daily'
    },
    interval: {
      type: Number,
      default: 1
    },
    daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
    endDate: Date,
    endAfterOccurrences: Number
  },
  
  // Priority and status
  priority: {
    type: String,
    enum: ['none', 'low', 'medium', 'high'],
    default: 'none'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'deleted'],
    default: 'active'
  },
  
  // Organization
  tags: [{
    type: String,
    trim: true
  }],
  subtasks: [subtaskSchema],
  
  // Attachments
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Reminders
  reminders: [{
    type: Date
  }],
  
  // Completion
  completedAt: {
    type: Date,
    default: null
  },
  
  // Google Calendar sync
  googleCalendarEventId: {
    type: String,
    default: null
  },
  syncedWithGoogle: {
    type: Boolean,
    default: false
  },
  
  // Pomodoro tracking
  pomodoroSessions: [{
    startTime: Date,
    endTime: Date,
    completed: Boolean
  }],
  
  // Order in list
  order: {
    type: Number,
    default: 0
  },
  
  // AI-generated flag
  createdByAI: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, list: 1, status: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, tags: 1 });

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date() > this.dueDate;
});

module.exports = mongoose.model('Task', taskSchema);

