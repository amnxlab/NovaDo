const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password required only if not Google OAuth
    }
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Google OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  googleAccessToken: String,
  googleRefreshToken: String,
  
  // LLM API Configuration
  llmProvider: {
    type: String,
    enum: ['openai', 'deepseek', null],
    default: null
  },
  llmApiKey: {
    type: String, // Encrypted
    default: null
  },
  
  // User preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      taskReminders: {
        type: Boolean,
        default: true
      }
    },
    defaultList: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'List',
      default: null
    },
    pomodoroSettings: {
      workDuration: {
        type: Number,
        default: 25 // minutes
      },
      shortBreak: {
        type: Number,
        default: 5
      },
      longBreak: {
        type: Number,
        default: 15
      },
      sessionsBeforeLongBreak: {
        type: Number,
        default: 4
      }
    }
  },
  
  // Push notification subscription
  pushSubscription: {
    type: Object,
    default: null
  },
  
  // Account status
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Statistics
  stats: {
    totalTasksCompleted: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastCompletionDate: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.googleAccessToken;
  delete user.googleRefreshToken;
  delete user.llmApiKey;
  return user;
};

module.exports = mongoose.model('User', userSchema);

