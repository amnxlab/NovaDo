/**
 * Task Matrix Type Definitions (JSDoc)
 * These types document the data structures used in the Task Matrix feature
 * Requirements: 1.1-1.8, Design Document Data Models
 */

/**
 * @typedef {'high' | 'medium' | 'low'} Priority
 * Priority levels for tasks (Requirement 1.1)
 */

/**
 * @typedef {'todo' | 'in_progress' | 'scheduled' | 'completed' | 'skipped'} Status
 * Task status values (Requirement 1.2)
 */

/**
 * @typedef {'high' | 'medium' | 'low'} EnergyLevel
 * Energy level classification (Requirement 1.5)
 */

/**
 * @typedef {'morning' | 'afternoon' | 'evening'} TimeOfDay
 * Time of day classification (Requirement 1.6)
 */

/**
 * @typedef {'eisenhower' | 'kanban' | 'list' | 'dashboard'} ViewMode
 * Available view modes (Requirement 3.1)
 */

/**
 * @typedef {'doFirst' | 'schedule' | 'delegate' | 'eliminate'} EisenhowerQuadrant
 * Eisenhower matrix quadrants (Requirement 4.1)
 */

/**
 * @typedef {Object} Task
 * @property {string} id - Unique task identifier
 * @property {string} _id - MongoDB identifier (alias)
 * @property {string} title - Task title
 * @property {string} [description] - Optional task description
 * @property {Priority} priority - Task priority level
 * @property {Status} status - Current task status
 * @property {string[]} tags - User-defined tags (Requirement 1.3)
 * @property {EnergyLevel} [energyLevel] - Energy level required
 * @property {TimeOfDay} [timeOfDay] - Preferred time of day
 * @property {string} [dueDate] - ISO date string for due date
 * @property {string} [scheduledDate] - ISO date string for scheduled date
 * @property {string} [completedAt] - ISO date string when completed
 * @property {string} [calendarEventId] - Linked calendar event ID
 * @property {boolean} completed - Legacy completion flag
 * @property {string} createdAt - ISO date string
 * @property {string} updatedAt - ISO date string
 */

/**
 * @typedef {Object} FilterState
 * @property {Priority[]} priorities - Selected priority filters
 * @property {Status[]} statuses - Selected status filters
 * @property {string[]} tags - Selected tag filters
 * @property {(EnergyLevel | TimeOfDay)[]} fourthDimension - Fourth dimension filters
 */

/**
 * @typedef {Object} MatrixPreferences
 * @property {ViewMode} currentView - Currently selected view
 * @property {'energy' | 'time_of_day'} fourthDimensionType - Fourth dimension type
 * @property {boolean} focusModeEnabled - Focus mode state
 * @property {FilterState} filters - Active filters
 * @property {SensoryPreferences} preferences - Sensory customization
 */

/**
 * @typedef {Object} SensoryPreferences
 * @property {boolean} animationsEnabled - Enable/disable animations
 * @property {boolean} soundEnabled - Enable/disable sounds
 * @property {boolean} calmModeEnabled - Enable calm mode colors
 * @property {'slow' | 'normal' | 'fast'} animationSpeed - Animation speed
 */

/**
 * @typedef {Object} StreakData
 * @property {number} current - Current streak count
 * @property {number} longest - Longest streak achieved
 * @property {number} highPriority - High priority task streak
 * @property {number} highEnergy - High energy task streak
 */

/**
 * @typedef {Object} DashboardStats
 * @property {number} total - Total task count
 * @property {number} completed - Completed task count
 * @property {number} highPriority - High priority task count
 * @property {number} dueToday - Tasks due today
 * @property {Object} byPriority - Tasks grouped by priority
 * @property {Object} byStatus - Tasks grouped by status
 * @property {Object} byEnergy - Tasks grouped by energy level
 */

/**
 * @typedef {Object} AISuggestion
 * @property {string} text - Suggestion text
 * @property {string} action - Action identifier
 */

// Export for documentation purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
}
