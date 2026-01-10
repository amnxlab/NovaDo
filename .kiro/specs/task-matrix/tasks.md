# Implementation Plan: Task Matrix

## Overview

This implementation plan breaks down the Task Matrix feature into discrete, incremental coding tasks. Each task builds on previous work and includes specific requirements references. The plan follows a phased approach: core infrastructure → view implementation → ADHD optimizations → advanced features → testing and polish.

## Tasks

- [x] 1. Set up project structure and core infrastructure
  - Create `/matrix` route and page component
  - Set up TaskMatrixContext with useReducer for state management
  - Define TypeScript interfaces for Task, UserPreferences, FilterState, StreakData
  - Configure Tailwind CSS with custom theme variables (--primary, --background, etc.)
  - Install dependencies: framer-motion, react-beautiful-dnd, chart.js, fast-check
  - Set up testing framework (Jest, React Testing Library, fast-check)
  - _Requirements: 22.1, 22.2, 21.2, 21.3_

- [x] 2. Implement base TaskCard component
  - [x] 2.1 Create TaskCard component with props interface
    - Implement card layout with title, description, dimensions display
    - Add status icon rendering (✅, ❌, ⏳, 📅, unchecked)
    - Add priority color-coded left border
    - Add tag pill badges (max 3 visible, "+N more" indicator)
    - Add fourth dimension icon in top-right corner
    - Implement hover and drag states with Framer Motion
    - Add ARIA labels for accessibility
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 1.1, 1.2, 1.3, 20.2_

  - [x] 2.2 Write property test for TaskCard status icon mapping
    - **Property 3: Status Icon Mapping**
    - **Validates: Requirements 2.1, 2.3**
    - Created: `static/js/tests/taskMatrix.property.test.js`

  - [x] 2.3 Write unit tests for TaskCard rendering
    - Test card renders with correct priority border color
    - Test tag badges display correctly with overflow handling
    - Test hover and drag state styling
    - Test accessibility attributes (ARIA labels, tabindex)
    - Created: `static/js/tests/taskMatrix.unit.test.js`
    - Created: `static/js/tests/test-runner.html` (browser test runner)
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 20.2_


- [ ] 3. Implement FilterBar component
  - [ ] 3.1 Create FilterBar with multi-select filter chips
    - Implement Priority filter group (High, Medium, Low chips)
    - Implement Status filter group (To Do, In Progress, Scheduled, Completed, Skipped chips)
    - Implement Tags filter dropdown with search
    - Implement fourth dimension filter group (dynamic based on configuration)
    - Add "Clear All Filters" button
    - Add active filter count badge
    - Implement real-time filtering with 150ms debounce
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

  - [ ] 3.2 Write property test for filter application
    - **Property 22: Filter Application**
    - **Validates: Requirements 16.6**

  - [ ] 3.3 Write unit tests for FilterBar interactions
    - Test chip toggle updates filter state
    - Test "Clear All" resets all filters
    - Test filter count badge displays correct number
    - _Requirements: 16.2, 16.3, 16.8_

- [ ] 4. Implement view switcher and routing
  - Create ViewSwitcher component with tabs/segmented control
  - Implement view mode state management in TaskMatrixContext
  - Add smooth 200ms fade transitions between views using Framer Motion
  - Implement view preference persistence to localStorage and user settings API
  - Add deep linking support with URL parameters (?view=kanban&priority=high)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4.1 Write property test for view preference persistence
  - **Property 4: View Preference Persistence**
  - **Validates: Requirements 3.4**

- [ ] 4.2 Write property test for filter preservation across views
  - **Property 5: Filter Preservation Across Views**
  - **Validates: Requirements 3.5, 16.9**

- [ ] 5. Checkpoint - Core infrastructure complete
  - Ensure all tests pass
  - Verify TaskCard renders correctly with all dimension combinations
  - Verify FilterBar applies filters and updates display
  - Verify view switching works with smooth transitions
  - Ask the user if questions arise


- [ ] 6. Implement EisenhowerMatrixView
  - [ ] 6.1 Create EisenhowerMatrixView component with 2×2 grid layout
    - Implement four quadrants (Do First, Schedule, Delegate, Eliminate)
    - Add quadrant headers with icons and labels
    - Implement scrollable task card containers within each quadrant
    - Add 24px gap between quadrants
    - Allocate 50% screen width to each quadrant on desktop
    - _Requirements: 4.1, 4.2, 4.3, 4.7_

  - [ ] 6.2 Implement task positioning logic based on urgency and importance
    - Create function to calculate Eisenhower quadrant from task properties
    - Implement task filtering and grouping by quadrant
    - Add visual distinction for completed tasks (fade, green tint, bottom position)
    - _Requirements: 4.2, 4.3, 4.4, 4.9_

  - [ ] 6.3 Write property test for Eisenhower quadrant sorting
    - **Property 6: Eisenhower Quadrant Sorting**
    - **Validates: Requirements 4.9**

  - [ ] 6.4 Add "Clear Quadrant" button functionality
    - Implement bulk complete/archive for all tasks in a quadrant
    - Add confirmation dialog for destructive action
    - Trigger celebration animation when quadrant is cleared
    - _Requirements: 4.8_

  - [ ] 6.5 Implement swimlane mode for fourth dimension
    - Add toggle control for swimlane mode
    - Subdivide each quadrant into 3 horizontal rows (Energy/Time)
    - Add row headers with icons
    - Update task positioning to respect swimlanes
    - _Requirements: 4.6_

  - [ ] 6.6 Write unit tests for EisenhowerMatrixView
    - Test four quadrants render with correct labels
    - Test tasks appear in correct quadrants based on properties
    - Test completed tasks fade to bottom
    - Test swimlane mode displays correctly
    - _Requirements: 4.1, 4.4, 4.6, 4.9_

- [ ] 7. Implement KanbanView
  - [ ] 7.1 Create KanbanView component with five status columns
    - Implement columns for To Do, In Progress, Scheduled, Completed, Skipped
    - Add column headers with status icons, labels, and task count badges
    - Set fixed column width (320px) with horizontal scrolling
    - Add 16px gap between columns
    - _Requirements: 5.1_

  - [ ] 7.2 Implement priority-based vertical sorting within columns
    - Sort tasks by priority (High → Medium → Low) within each column
    - Add visual dividers between priority levels (1px subtle line)
    - Add priority accent bars (red=high, yellow=medium, blue=low)
    - _Requirements: 5.2_

  - [ ] 7.3 Write property test for Kanban priority sorting
    - **Property 7: Kanban Priority Sorting**
    - **Validates: Requirements 5.2**

  - [ ] 7.4 Implement drag-and-drop with react-beautiful-dnd
    - Wrap KanbanView in DragDropContext
    - Make columns Droppable and task cards Draggable
    - Implement onDragEnd handler to update task status
    - Add visual shadows and drag preview
    - Implement haptic feedback for mobile (if supported)
    - _Requirements: 5.5, 5.6, 12.1, 12.2, 12.3_

  - [ ] 7.5 Write property test for drag-drop property updates
    - **Property 8: Drag-Drop Property Updates**
    - **Validates: Requirements 5.4, 12.4**

  - [ ] 7.6 Add swimlane mode and Quick Filter presets
    - Implement optional horizontal swimlanes across columns
    - Create Quick Filter preset buttons (High Priority Only, High Energy Only, etc.)
    - Add infinite scroll within columns using react-window
    - _Requirements: 5.4, 5.7, 5.8_

  - [ ] 7.7 Write unit tests for KanbanView
    - Test five columns render with correct headers
    - Test tasks sort by priority within columns
    - Test drag-drop updates task status
    - Test Quick Filter presets apply correct filters
    - _Requirements: 5.1, 5.2, 5.5, 5.8_


- [ ] 8. Implement SmartListView
  - [ ] 8.1 Create SmartListView component with single-column layout
    - Implement vertical scrollable list (max 800px width, centered)
    - Add sort controls at top (sticky position)
    - Implement virtual scrolling with react-window for performance
    - Add 12px vertical gap between cards
    - _Requirements: 6.1_

  - [ ] 8.2 Implement auto-sort algorithm
    - Create composite scoring function (priority + energy match + status urgency + tag relevance)
    - Implement energy/time matching based on current time
    - Calculate tag relevance from user interaction history
    - Sort tasks by composite score (highest first)
    - _Requirements: 6.2_

  - [ ] 8.3 Write property test for smart list sorting consistency
    - **Property 9: Smart List Sorting Consistency**
    - **Validates: Requirements 6.2**

  - [ ] 8.4 Implement Hyperfocus Mode
    - Add Hyperfocus Toggle control
    - Limit display to top 5 tasks when enabled
    - Increase card size (320px height) in hyperfocus mode
    - Add prominent "Complete" button on cards
    - Hide secondary UI elements
    - Add gentle pulsing animation on current task
    - _Requirements: 6.7_

  - [ ] 8.5 Write property test for hyperfocus task limit
    - **Property 10: Hyperfocus Task Limit**
    - **Validates: Requirements 6.7**

  - [ ] 8.6 Implement swipe gestures
    - Add swipe-to-complete (right swipe >50% width)
    - Add swipe-to-skip (left swipe >50% width)
    - Show action preview with colored background reveal
    - Implement snap-back animation for partial swipes
    - Add haptic feedback at 50% threshold
    - Implement undo functionality for swipe actions
    - _Requirements: 6.8, 13.1, 13.2, 13.3, 13.4, 13.6_

  - [ ] 8.7 Write property tests for swipe gestures
    - **Property 17: Swipe Gesture Completion**
    - **Property 18: Swipe Undo Round-Trip**
    - **Validates: Requirements 13.1, 13.6**

  - [ ] 8.8 Add AI Resort button
    - Create "AI Resort" button in header
    - Implement placeholder AI suggestion logic (to be enhanced later)
    - Show loading state during resort
    - _Requirements: 6.9_

  - [ ] 8.9 Write unit tests for SmartListView
    - Test tasks sort by composite algorithm
    - Test hyperfocus mode limits task count
    - Test swipe gestures trigger correct actions
    - Test undo restores previous state
    - _Requirements: 6.2, 6.7, 13.1, 13.6_

- [ ] 9. Checkpoint - Core views complete
  - Ensure all tests pass
  - Verify Eisenhower view displays four quadrants correctly
  - Verify Kanban view supports drag-drop between columns
  - Verify Smart List view sorts intelligently and supports swipes
  - Verify all views respect active filters
  - Ask the user if questions arise


- [ ] 10. Implement DashboardView
  - [ ] 10.1 Create DashboardView with grid layout system
    - Implement 12-column responsive grid using react-grid-layout
    - Add drag-drop widget repositioning
    - Create widget menu panel (collapsible)
    - Support widget sizes: 1×1, 2×1, 2×2, 3×2
    - _Requirements: 7.1, 7.3_

  - [ ] 10.2 Create widget components
    - Implement MiniMatrixWidget (compact Eisenhower view)
    - Implement EnergyHeatmapWidget (Chart.js heatmap)
    - Implement TagDistributionWidget (Chart.js pie chart)
    - Implement FilteredListWidget (customizable task list)
    - Implement StreakWidget (visual streak display)
    - Implement ProgressWidget (circular progress indicators)
    - _Requirements: 7.2_

  - [ ] 10.3 Implement dashboard templates and configuration
    - Create preset templates (Simple 4D Slice, Energy Focus, Tag Overview, Completion Tracker)
    - Implement save/load custom dashboard configurations
    - Add pivot-style grouping configuration
    - Persist dashboard layout to user preferences
    - _Requirements: 7.4, 7.5, 7.6_

  - [ ] 10.4 Write property test for dashboard configuration round-trip
    - **Property 11: Dashboard Configuration Round-Trip**
    - **Validates: Requirements 7.5**

  - [ ] 10.5 Write unit tests for DashboardView
    - Test widgets can be dragged and repositioned
    - Test preset templates load correct layouts
    - Test custom configurations save and restore
    - _Requirements: 7.1, 7.4, 7.5_

- [ ] 11. Implement Focus Mode
  - [ ] 11.1 Create Focus Mode toggle and logic
    - Add Focus Mode toggle control in header
    - Implement dimension hiding (show only 1-2 dimensions)
    - Limit task display to 3-5 tasks
    - Highlight most urgent/important tasks
    - Add clear visual indicator when Focus Mode is active
    - Persist Focus Mode state across sessions
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 11.2 Write property test for focus mode dimension reduction
    - **Property 14: Focus Mode Dimension Reduction**
    - **Validates: Requirements 10.2, 10.3**

  - [ ] 11.3 Write unit tests for Focus Mode
    - Test toggle enables/disables focus mode
    - Test task count is limited when enabled
    - Test dimensions are hidden when enabled
    - Test state persists across sessions
    - _Requirements: 10.1, 10.2, 10.3, 10.5_


- [ ] 12. Implement celebration and dopamine boost mechanisms
  - [ ] 12.1 Create CelebrationOverlay component
    - Implement confetti animation using canvas-confetti library
    - Add celebratory sound effect (optional, user-configurable)
    - Implement haptic feedback for mobile devices
    - Add toast notification with achievement text
    - Implement 2-second fade-out animation
    - _Requirements: 9.1, 9.2, 9.6_

  - [ ] 12.2 Write property test for completion celebration trigger
    - **Property 13: Completion Celebration Trigger**
    - **Validates: Requirements 9.1, 9.4**

  - [ ] 12.3 Implement streak tracking system
    - Create StreakData model and storage
    - Implement streak calculation logic (current, longest, dimension-specific)
    - Add StreakDisplay component showing current streaks
    - Implement milestone detection (5, 10, 25, 50, 100 days)
    - Award badges for milestone achievements
    - _Requirements: 9.4, 9.5_

  - [ ] 12.4 Add micro-animations for interactions
    - Implement gentle glow effect on drag using Framer Motion
    - Add hover animations on interactive elements
    - Implement smooth card transitions
    - _Requirements: 9.3_

  - [ ] 12.5 Write unit tests for celebration system
    - Test confetti triggers on task completion
    - Test streak counter increments correctly
    - Test milestone badges are awarded
    - Test animations can be disabled in settings
    - _Requirements: 9.1, 9.4, 9.5, 9.7_

- [ ] 13. Implement sensory customization options
  - [ ] 13.1 Create settings panel for sensory preferences
    - Add "Reduce Animations" toggle
    - Add "Calm Mode" toggle (softer pastel palettes)
    - Add sound effects toggle
    - Add animation speed selector (slow, normal, fast)
    - Implement prefers-reduced-motion detection
    - Ensure full functionality with all options adjusted
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ] 13.2 Write property test for motion preference respect
    - **Property 15: Motion Preference Respect**
    - **Validates: Requirements 11.5**

  - [ ] 13.3 Write unit tests for sensory customization
    - Test animations disable when "Reduce Animations" is on
    - Test Calm Mode applies pastel colors
    - Test sound effects can be toggled
    - Test prefers-reduced-motion is respected
    - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [ ] 14. Implement keyboard shortcuts
  - [ ] 14.1 Add keyboard shortcut handlers
    - Implement Ctrl+1 through Ctrl+4 for Eisenhower quadrant navigation
    - Implement arrow keys for task navigation
    - Implement Enter to open task details
    - Implement Space to toggle task completion
    - Implement F to toggle Focus Mode
    - Implement ? to show keyboard shortcut reference guide
    - Ensure shortcuts don't conflict with browser defaults
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [ ] 14.2 Write property test for keyboard navigation sequence
    - **Property 19: Keyboard Navigation Sequence**
    - **Validates: Requirements 14.2**

  - [ ] 14.3 Write unit tests for keyboard shortcuts
    - Test Ctrl+1-4 switches quadrants in Eisenhower view
    - Test arrow keys move focus between tasks
    - Test Enter opens task details
    - Test Space toggles completion
    - Test F toggles Focus Mode
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 15. Checkpoint - ADHD optimizations complete
  - Ensure all tests pass
  - Verify Focus Mode reduces cognitive load
  - Verify celebrations trigger on completions
  - Verify sensory options work correctly
  - Verify keyboard shortcuts function properly
  - Ask the user if questions arise


- [ ] 16. Implement AI-powered task suggestions
  - [ ] 16.1 Create AI pattern tracking system
    - Implement AIPattern model and storage
    - Track completion time distribution by time-of-day
    - Track completion energy distribution
    - Track tag completion rates and time preferences
    - Track priority completion times
    - _Requirements: 15.2, 15.3_

  - [ ] 16.2 Implement AI suggestion generation
    - Create algorithm to analyze user patterns
    - Generate task reordering suggestions based on historical data
    - Add explanatory text for suggestions (e.g., "Resort by High-Energy first based on 70% morning completion rate")
    - Implement minimum data requirement check (10+ completed tasks)
    - _Requirements: 15.1, 15.3, 15.4, 15.7_

  - [ ] 16.3 Write property test for AI suggestion generation
    - **Property 20: AI Suggestion Generation**
    - **Validates: Requirements 15.3**

  - [ ] 16.4 Implement suggestion acceptance/rejection and learning
    - Add UI for accepting or rejecting suggestions
    - Track acceptance/rejection rates
    - Update AI model weights based on user feedback
    - _Requirements: 15.5, 15.6_

  - [ ] 16.5 Write property test for AI learning from feedback
    - **Property 21: AI Learning from Feedback**
    - **Validates: Requirements 15.6**

  - [ ] 16.6 Write unit tests for AI suggestions
    - Test suggestions are generated with sufficient data
    - Test suggestions include explanatory text
    - Test acceptance updates AI model
    - Test rejection updates AI model
    - _Requirements: 15.3, 15.4, 15.5, 15.6_

- [ ] 17. Implement data visualizations
  - [ ] 17.1 Create visualization panel component
    - Implement collapsible visualization panel
    - Add toggle control to show/hide panel
    - Set up Chart.js with theme-aware colors
    - _Requirements: 17.1, 17.5_

  - [ ] 17.2 Implement Chart.js visualizations
    - Create pie chart for task distribution by tags
    - Create radar chart for balance across four dimensions
    - Create bar chart for task counts by status
    - Implement real-time updates as tasks change
    - Add export functionality for visualization data
    - _Requirements: 17.2, 17.3, 17.4, 17.6, 17.7_

  - [ ] 17.3 Write property test for visualization data consistency
    - **Property 23: Visualization Data Consistency**
    - **Validates: Requirements 17.6**

  - [ ] 17.4 Write unit tests for visualizations
    - Test pie chart displays correct tag distribution
    - Test radar chart shows dimension balance
    - Test bar chart shows status counts
    - Test charts update when tasks change
    - _Requirements: 17.2, 17.3, 17.4, 17.6_


- [ ] 18. Implement calendar integration and event cards
  - [ ] 18.1 Create EventCard component variant
    - Extend TaskCard for calendar-linked tasks
    - Display event title prominently
    - Display event time in readable format
    - Adapt styling to current theme (not solid green)
    - Ensure title and time remain visible for short events
    - Add visual distinction from regular task cards
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [ ] 18.2 Write property test for event card content completeness
    - **Property 24: Event Card Content Completeness**
    - **Validates: Requirements 18.5**

  - [ ] 18.3 Write unit tests for EventCard
    - Test event title displays prominently
    - Test event time displays in readable format
    - Test styling adapts to theme
    - Test short events show both title and time
    - _Requirements: 18.2, 18.3, 18.4, 18.5_

- [ ] 19. Implement Won't Do task management
  - [ ] 19.1 Add Skipped status support
    - Ensure Skipped status is available in status selector
    - Add Skipped column to Kanban view
    - Implement filter to show/hide skipped tasks
    - Add archive functionality for skipped tasks
    - Create dedicated view for reviewing skipped tasks
    - Implement reactivation of skipped tasks
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

  - [ ] 19.2 Write property test for skipped task reactivation
    - **Property 25: Skipped Task Reactivation**
    - **Validates: Requirements 19.6**

  - [ ] 19.3 Write unit tests for Won't Do management
    - Test Skipped column appears in Kanban view
    - Test filter shows/hides skipped tasks
    - Test skipped tasks can be archived
    - Test skipped tasks can be reactivated
    - _Requirements: 19.2, 19.3, 19.4, 19.6_

- [ ] 20. Implement accessibility features
  - [ ] 20.1 Add ARIA labels and semantic HTML
    - Add screen reader labels to all interactive elements
    - Use semantic HTML (nav, main, section, article)
    - Implement proper heading hierarchy
    - Add ARIA landmarks
    - _Requirements: 20.2_

  - [ ] 20.2 Implement keyboard navigation support
    - Ensure all features accessible via keyboard
    - Add visible focus indicators
    - Implement logical tab order
    - Support keyboard-based drag-and-drop
    - _Requirements: 12.6, 20.3, 20.7_

  - [ ] 20.3 Add color-blind friendly modes
    - Implement patterns in addition to colors for status
    - Add color-blind mode toggle
    - Ensure sufficient contrast in all modes
    - _Requirements: 20.4_

  - [ ] 20.4 Write property test for text contrast compliance
    - **Property 26: Text Contrast Compliance**
    - **Validates: Requirements 20.6**

  - [ ] 20.5 Implement voice command support
    - Integrate Web Speech API
    - Add voice commands for common actions
    - Provide visual feedback for voice input
    - _Requirements: 20.5_

  - [ ] 20.6 Write accessibility tests
    - Run jest-axe automated accessibility checks
    - Test keyboard navigation works for all features
    - Test screen reader labels are present
    - Test focus indicators are visible
    - Test contrast ratios meet WCAG 2.2 AA
    - _Requirements: 20.1, 20.2, 20.3, 20.6, 20.7_


- [ ] 21. Implement theming and visual consistency
  - [ ] 21.1 Set up theme system with CSS custom properties
    - Define CSS variables for light and dark themes
    - Implement theme toggle functionality
    - Add smooth 300ms theme transition animation
    - Ensure all text remains readable in both themes
    - Adapt charts and icons to current theme
    - Persist theme preference across sessions
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_

  - [ ] 21.2 Write property test for theme preference persistence
    - **Property 27: Theme Preference Persistence**
    - **Validates: Requirements 21.7**

  - [ ] 21.3 Write unit tests for theming
    - Test theme toggle switches between light and dark
    - Test CSS variables update on theme change
    - Test charts adapt to theme
    - Test text remains readable in both themes
    - Test theme preference persists
    - _Requirements: 21.1, 21.3, 21.4, 21.5, 21.7_

- [ ] 22. Implement performance optimizations
  - [ ] 22.1 Add lazy loading and code splitting
    - Implement React.lazy for view components
    - Add Suspense boundaries with loading states
    - Implement code splitting for routes
    - _Requirements: 22.3, 22.8_

  - [ ] 22.2 Implement virtual scrolling for large lists
    - Add react-window for lists with >50 tasks
    - Implement virtual scrolling in SmartListView
    - Implement virtual scrolling in Kanban columns
    - _Requirements: 22.4_

  - [ ] 22.3 Write property test for virtual scrolling activation
    - **Property 28: Virtual Scrolling Activation**
    - **Validates: Requirements 22.4**

  - [ ] 22.3 Add performance optimizations
    - Implement React.memo for TaskCard and other components
    - Use useMemo for expensive calculations (sorting, filtering)
    - Use useCallback for event handlers
    - Debounce filter and search inputs by 300ms
    - _Requirements: 22.5, 22.7_

  - [ ] 22.4 Write performance tests
    - Test initial load time is <2 seconds
    - Test view switch time is <200ms
    - Test filter application time is <300ms
    - Test virtual scrolling renders only visible items
    - _Requirements: 22.4, 22.6_

- [ ] 23. Implement empty state handling
  - [ ] 23.1 Create empty state components
    - Design empty state illustration
    - Add helpful onboarding text
    - Add "Create First Task" button
    - Distinguish between truly empty and filtered empty states
    - Add "No tasks match filters" message for filtered empty
    - Suggest removing filters when filtered empty
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6_

  - [ ] 23.2 Write unit tests for empty states
    - Test empty state shows when no tasks exist
    - Test "Create First Task" button appears
    - Test filtered empty state shows different message
    - Test suggestion to remove filters appears
    - _Requirements: 23.1, 23.3, 23.4, 23.5_


- [ ] 24. Implement mobile responsiveness
  - [ ] 24.1 Add responsive layout adjustments
    - Implement breakpoint detection (768px)
    - Stack Eisenhower quadrants vertically on mobile
    - Enable horizontal scrolling for Kanban columns on mobile
    - Simplify filter bar to collapsible panel on mobile
    - _Requirements: 24.1, 24.2, 24.3, 24.5_

  - [ ] 24.2 Increase touch target sizes for mobile
    - Ensure all interactive elements are minimum 44×44px on mobile
    - Increase button sizes and padding
    - Add larger tap areas for small controls
    - _Requirements: 24.4_

  - [ ] 24.3 Write property test for mobile touch target sizing
    - **Property 29: Mobile Touch Target Sizing**
    - **Validates: Requirements 24.4**

  - [ ] 24.3 Add mobile-specific features
    - Implement pull-to-refresh gesture
    - Optimize animations for mobile performance
    - Test on various mobile viewport sizes
    - _Requirements: 24.6_

  - [ ] 24.4 Write mobile responsiveness tests
    - Test layout adapts for screens <768px
    - Test Eisenhower quadrants stack vertically
    - Test Kanban columns scroll horizontally
    - Test touch targets meet size requirements
    - Test pull-to-refresh works
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.6_

- [ ] 25. Implement data persistence and sync
  - [ ] 25.1 Add immediate backend persistence
    - Implement API calls for task updates
    - Ensure changes save within 100ms of user action
    - Add optimistic UI updates
    - Implement rollback on API failure
    - _Requirements: 25.1_

  - [ ]* 25.2 Write property test for immediate backend persistence
    - **Property 30: Immediate Backend Persistence**
    - **Validates: Requirements 25.1**

  - [ ] 25.2 Implement offline support and sync
    - Set up IndexedDB for offline storage
    - Queue changes when offline
    - Implement sync when connection restored
    - Add sync status indicators
    - Handle sync conflicts (last-write-wins)
    - _Requirements: 25.5, 25.6, 25.7_

  - [ ]* 25.3 Write property test for offline queue and sync
    - **Property 31: Offline Queue and Sync**
    - **Validates: Requirements 25.5**

  - [ ] 25.3 Implement preference persistence
    - Save view preferences to user settings API
    - Save filter settings to localStorage
    - Implement cross-device sync for preferences
    - _Requirements: 25.2, 25.3, 25.4_

  - [ ]* 25.4 Write unit tests for data persistence
    - Test task updates trigger API calls
    - Test offline changes queue correctly
    - Test sync occurs when connection restored
    - Test preferences persist across sessions
    - Test sync conflicts resolve correctly
    - _Requirements: 25.1, 25.2, 25.3, 25.5, 25.7_

- [ ] 26. Checkpoint - All features complete
  - Ensure all tests pass (unit + property)
  - Verify all 31 correctness properties are validated
  - Verify accessibility compliance (WCAG 2.2 AA)
  - Verify mobile responsiveness on multiple devices
  - Verify performance meets targets (<2s load, <200ms transitions)
  - Ask the user if questions arise


- [ ] 27. Integration testing and polish
  - [ ]* 27.1 Write integration tests
    - Test drag task from Eisenhower to Kanban view
    - Test filter application persists across view switches
    - Test task completion triggers celebration and updates streak
    - Test offline task creation syncs when online
    - Test AI suggestions based on historical data
    - _Requirements: Multiple_

  - [ ]* 27.2 Write end-to-end tests with Playwright
    - Test complete user workflow: create → organize → complete
    - Test multi-filter application and view switching
    - Test Focus Mode workflow
    - Test dashboard customization and save
    - Test mobile responsive behavior
    - _Requirements: Multiple_

  - [ ] 27.3 Perform accessibility audit
    - Run automated accessibility tests (jest-axe)
    - Manual testing with screen readers (NVDA, JAWS, VoiceOver)
    - Keyboard-only navigation testing
    - Color contrast verification
    - Fix any identified issues
    - _Requirements: 20.1, 20.2, 20.3, 20.6, 20.7_

  - [ ] 27.4 Performance optimization and testing
    - Run Lighthouse performance audits
    - Profile with React DevTools
    - Optimize any slow renders or interactions
    - Test with 100, 500, and 1000 tasks
    - Verify load times and interaction responsiveness
    - _Requirements: 22.6_

  - [ ] 27.5 Visual polish and refinement
    - Review all animations for smoothness
    - Ensure consistent spacing and alignment
    - Verify theme consistency across all components
    - Test on multiple browsers (Chrome, Firefox, Safari)
    - Fix any visual bugs or inconsistencies
    - _Requirements: Multiple_

- [ ] 28. Documentation and deployment preparation
  - Create user documentation for Task Matrix features
  - Document keyboard shortcuts and gestures
  - Create developer documentation for component APIs
  - Add inline code comments for complex logic
  - Prepare deployment configuration
  - Create release notes

- [ ] 29. Final checkpoint and user testing
  - Ensure all tests pass (100% of property tests, >80% unit test coverage)
  - Verify all 25 requirements are met
  - Conduct user testing with ADHD users (if possible)
  - Gather feedback and create follow-up tasks
  - Prepare for production deployment
  - Ask the user for final approval

## Notes

- Tasks marked with `*` are optional test-related sub-tasks that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties (31 total)
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation follows a phased approach: infrastructure → views → optimizations → advanced features → polish
- All property-based tests should run with minimum 100 iterations
- Focus on ADHD-optimized principles throughout: minimal cognitive load, dopamine boosts, flexibility, and accessibility
