const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  name: {
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
  
  // Frequency
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'custom'],
    default: 'daily'
  },
  targetDays: [Number], // 0-6 for weekly (Sunday-Saturday)
  targetCount: {
    type: Number,
    default: 1 // Times per day/week
  },
  
  // Tracking
  completions: [{
    date: {
      type: Date,
      required: true
    },
    count: {
      type: Number,
      default: 1
    },
    note: String
  }],
  
  // Streak tracking
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  
  // Settings
  color: {
    type: String,
    default: '#52c41a'
  },
  icon: {
    type: String,
    default: 'check-circle'
  },
  reminder: {
    enabled: {
      type: Boolean,
      default: false
    },
    time: String // Format: "HH:mm"
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  
  // Start date
  startDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for queries
habitSchema.index({ user: 1, isActive: 1 });

// Method to check if habit is completed today
habitSchema.methods.isCompletedToday = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayCompletion = this.completions.find(c => {
    const compDate = new Date(c.date);
    compDate.setHours(0, 0, 0, 0);
    return compDate.getTime() === today.getTime();
  });
  
  return todayCompletion && todayCompletion.count >= this.targetCount;
};

// Method to update streak
habitSchema.methods.updateStreak = function() {
  if (this.completions.length === 0) {
    this.currentStreak = 0;
    return;
  }

  const sortedCompletions = this.completions
    .map(c => new Date(c.date))
    .sort((a, b) => b - a);

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedCompletions.length; i++) {
    const compDate = new Date(sortedCompletions[i]);
    compDate.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);
    expectedDate.setHours(0, 0, 0, 0);

    if (compDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  this.currentStreak = streak;
  if (streak > this.longestStreak) {
    this.longestStreak = streak;
  }
};

module.exports = mongoose.model('Habit', habitSchema);

