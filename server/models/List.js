const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  color: {
    type: String,
    default: '#1890ff'
  },
  icon: {
    type: String,
    default: 'list'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isSmart: {
    type: Boolean,
    default: false
  },
  smartFilter: {
    type: Object,
    default: null
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
listSchema.index({ user: 1, isArchived: 1 });
listSchema.index({ user: 1, parent: 1 });

module.exports = mongoose.model('List', listSchema);

