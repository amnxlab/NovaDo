# Design Document: ADHD UI Enhancements

## Overview

This design document outlines the technical architecture for comprehensive UI/UX enhancements focused on neurodiversity-inclusive design principles. The solution encompasses immediate UI fixes for task status indicators, event card theming, and a "Won't Do" archive system, alongside a complete reconstruction of the Stats Page with advanced analytics, gamification, and adaptive viewing modes optimized for ADHD users.

The design emphasizes modularity, performance optimization, accessibility compliance (WCAG 2.2), and seamless integration with the existing React-based task management application.

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   UI Components │  │  Stats Engine   │  │ Theme Engine │ │
│  │                 │  │                 │  │              │ │
│  │ • StatusIcon    │  │ • ViewManager   │  │ • ThemeCtx   │ │
│  │ • EventCard     │  │ • DataAggregator│  │ • ColorUtils │ │
│  │ • WontDoTab     │  │ • ChartRenderer │  │ • Animations │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ State Management│  │ Data Processing │  │ AI Insights  │ │
│  │                 │  │                 │  │              │ │
│  │ • React Context │  │ • Analytics API │  │ • Pattern    │ │
│  │ • Local Storage │  │ • Data Cache    │  │   Detection  │ │
│  │ • Session State │  │ • Export Utils  │  │ • Suggestions│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Backend Integration                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Task API      │  │   Analytics API │  │  User Prefs  │ │
│  │                 │  │                 │  │              │ │
│  │ • CRUD Ops      │  │ • Metrics Calc  │  │ • Theme      │ │
│  │ • Status Updates│  │ • Trend Analysis│  │ • View Modes │ │
│  │ • Bulk Actions  │  │ • Export Data   │  │ • Gamification│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App
├── ThemeProvider
│   ├── NavigationSidebar
│   ├── TaskViews
│   │   ├── TaskList
│   │   │   └── TaskItem
│   │   │       └── StatusIcon
│   │   ├── KanbanBoard
│   │   └── CalendarView
│   │       └── EventCard
│   ├── CompletedSection
│   │   ├── CompletedTab
│   │   └── WontDoTab
│   └── StatsPage
│       ├── ViewSwitcher
│       ├── DailySnapshotView
│       ├── WeeklyTrendsView
│       ├── MonthlyAnalyticsView
│       ├── GamifiedProgressView
│       ├── CustomInsightView
│       └── HyperfocusMode
```

## Components and Interfaces

### Core UI Enhancement Components

#### StatusIcon Component

```typescript
interface StatusIconProps {
  status: 'complete' | 'in-progress' | 'scheduled' | 'skipped';
  theme: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

interface StatusIconConfig {
  emoji: string;
  color: string;
  animation?: string;
  ariaLabel: string;
}
```

**Implementation Details:**
- Uses CSS-in-JS for theme-adaptive styling
- Supports animated SVG for "in-progress" status
- Implements ARIA labels for accessibility
- Optimized for performance with React.memo

#### EventCard Component

```typescript
interface EventCardProps {
  event: CalendarEvent;
  theme: ThemeConfig;
  duration: number;
  position: CardPosition;
  onHover?: (event: CalendarEvent) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  gradients: {
    light: [string, string];
    dark: [string, string];
  };
}
```

**Styling Strategy:**
- CSS variables for dynamic theming
- Gradient backgrounds with fallback colors
- Responsive typography scaling
- Tooltip integration for truncated content

#### WontDoTab Component

```typescript
interface WontDoTabProps {
  tasks: SkippedTask[];
  onRestore: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  searchQuery?: string;
  filterBy?: 'reason' | 'date' | 'project';
}

interface SkippedTask extends Task {
  skippedAt: Date;
  reason?: string;
  originalDueDate?: Date;
}
```

### Stats Page Architecture

#### ViewManager System

```typescript
interface StatsViewManager {
  currentView: StatsViewType;
  viewHistory: StatsViewType[];
  switchView: (view: StatsViewType, transition?: TransitionType) => void;
  registerView: (view: StatsView) => void;
}

type StatsViewType = 
  | 'daily-snapshot'
  | 'weekly-trends' 
  | 'monthly-analytics'
  | 'gamified-progress'
  | 'custom-insights'
  | 'hyperfocus-mode';

interface StatsView {
  id: StatsViewType;
  component: React.ComponentType<StatsViewProps>;
  config: ViewConfig;
  dataRequirements: DataRequirement[];
}
```

#### Data Aggregation Engine

```typescript
interface AnalyticsDataAggregator {
  aggregateTaskMetrics: (timeRange: TimeRange) => TaskMetrics;
  calculateStreaks: (habits: Habit[]) => StreakData;
  generateInsights: (userData: UserData) => AIInsight[];
  exportData: (format: ExportFormat) => Promise<Blob>;
}

interface TaskMetrics {
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  averageCompletionTime: number;
  productivityScore: number;
  categoryBreakdown: CategoryMetric[];
}

interface StreakData {
  current: number;
  longest: number;
  streakHistory: StreakPoint[];
  streakType: 'task' | 'habit' | 'focus';
}
```

### Chart Configuration System

#### Chart.js Integration

```typescript
interface ChartConfig {
  type: 'line' | 'bar' | 'doughnut' | 'radar' | 'heatmap';
  data: ChartData;
  options: ChartOptions;
  theme: ChartTheme;
  responsive: boolean;
  animations: AnimationConfig;
}

interface ChartTheme {
  backgroundColor: string[];
  borderColor: string[];
  gridColor: string;
  textColor: string;
  tooltipTheme: TooltipTheme;
}

// Example Chart Configurations
const weeklyTrendsConfig: ChartConfig = {
  type: 'line',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Tasks Completed',
      data: [12, 19, 3, 5, 2, 3, 9],
      borderColor: 'var(--primary-color)',
      backgroundColor: 'var(--primary-color-alpha)',
      tension: 0.4
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'var(--tooltip-bg)',
        titleColor: 'var(--tooltip-text)',
        bodyColor: 'var(--tooltip-text)'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'var(--grid-color)' },
        ticks: { color: 'var(--text-secondary)' }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'var(--text-secondary)' }
      }
    }
  }
};
```

## Data Models

### Enhanced Task Model

```typescript
interface EnhancedTask extends BaseTask {
  status: TaskStatus;
  statusHistory: StatusChange[];
  completionMetrics: CompletionMetrics;
  gamificationData: GamificationData;
}

interface StatusChange {
  from: TaskStatus;
  to: TaskStatus;
  timestamp: Date;
  reason?: string;
  userId: string;
}

interface CompletionMetrics {
  estimatedDuration: number;
  actualDuration?: number;
  focusTime: number;
  interruptions: number;
  difficultyRating?: number;
}

interface GamificationData {
  xpEarned: number;
  streakContribution: boolean;
  badgesUnlocked: string[];
  celebrationTriggered: boolean;
}
```

### Analytics Data Models

```typescript
interface ProductivityMetrics {
  daily: DailyMetrics[];
  weekly: WeeklyMetrics[];
  monthly: MonthlyMetrics[];
  trends: TrendAnalysis;
  insights: AIInsight[];
}

interface DailyMetrics {
  date: Date;
  tasksCompleted: number;
  focusTime: number;
  streakMaintained: boolean;
  productivityScore: number;
  moodRating?: number;
  energyLevel?: number;
}

interface AIInsight {
  id: string;
  type: 'pattern' | 'suggestion' | 'achievement' | 'warning';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  suggestedActions?: string[];
  dataPoints: DataPoint[];
}
```

### Gamification Models

```typescript
interface UserProgress {
  level: number;
  xp: number;
  xpToNextLevel: number;
  badges: Badge[];
  streaks: StreakRecord[];
  achievements: Achievement[];
  pet?: VirtualPet;
}

interface VirtualPet {
  id: string;
  name: string;
  type: 'tree' | 'character' | 'abstract';
  level: number;
  happiness: number;
  growth: number;
  customizations: PetCustomization[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: Date;
  category: 'productivity' | 'consistency' | 'improvement' | 'special';
}
```

## Error Handling

### Error Boundary Strategy

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  fallbackComponent?: React.ComponentType;
}

class StatsPageErrorBoundary extends React.Component<Props, ErrorBoundaryState> {
  // Graceful degradation for chart rendering failures
  // Fallback to simplified text-based metrics
  // Error reporting to analytics service
}
```

### Data Loading States

```typescript
interface LoadingState {
  isLoading: boolean;
  error?: string;
  retryCount: number;
  lastAttempt?: Date;
}

interface DataState<T> {
  data?: T;
  loading: LoadingState;
  cache: CacheInfo;
}
```

## Testing Strategy

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property-Based Testing Overview

Property-based testing validates software correctness by testing universal properties across many generated inputs. Each property is a formal specification that should hold for all valid inputs, providing comprehensive coverage beyond traditional unit tests.

### Core Testing Principles

1. **Universal Quantification**: Every property must contain an explicit "for all" statement
2. **Requirements Traceability**: Each property must reference the requirements it validates  
3. **Executable Specifications**: Properties must be implementable as automated tests
4. **Comprehensive Coverage**: Properties should cover all testable acceptance criteria

### Common Property Patterns

1. **Invariants**: Properties that remain constant despite changes to structure or order
2. **Round Trip Properties**: Combining an operation with its inverse returns to original value
3. **Idempotence**: Operations where doing it twice equals doing it once
4. **Metamorphic Properties**: Relationships that must hold between components
5. **Error Conditions**: Generate bad inputs and ensure proper error signaling

Now I need to use the prework tool to analyze the acceptance criteria before writing the correctness properties:

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- Status indicator properties (1.1-1.4) can be combined into a single comprehensive property about status-emoji mapping
- Theme adaptation properties (1.5, 3.1, 3.2, 11.3) can be consolidated into theme consistency properties
- Event card display properties (3.3-3.6) can be combined into comprehensive event card behavior
- Chart and visualization properties (11.1, 11.2, 11.4, 11.5) can be consolidated into chart functionality properties

### Core Properties

#### Property 1: Status Indicator Consistency
*For any* task with a defined status, the Status_Indicator should display the correct emoji mapping: skipped tasks show ❌/🚫, complete tasks show ✅/✔️, in-progress tasks show ⏳/spinner, and scheduled tasks show 📅
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

#### Property 2: Cross-View Status Synchronization  
*For any* task status change, all views (task lists, Kanban boards, calendar views) should immediately reflect the updated status indicator
**Validates: Requirements 1.6**

#### Property 3: Theme-Responsive Visual Adaptation
*For any* theme change between light and dark modes, all visual elements (status indicators, event cards, charts) should adapt their colors while maintaining visibility and readability
**Validates: Requirements 1.5, 3.1, 3.2, 11.3**

#### Property 4: Skipped Task Categorization
*For any* task marked as "Skipped", the system should automatically categorize it under the "Won't Do" section and provide restore/delete options
**Validates: Requirements 2.2, 2.3**

#### Property 5: Won't Do Search and Filter
*For any* search query in the Won't Do section, the system should filter tasks by user-added notes and reasons, returning only matching results
**Validates: Requirements 2.4**

#### Property 6: Event Card Responsive Display
*For any* calendar event, the Event_Card should use appropriate gradients based on theme, maintain minimum height for short events (<30 minutes), and truncate long titles with tooltips
**Validates: Requirements 3.3, 3.4, 3.5, 3.6**

#### Property 7: Stats Page View Transitions
*For any* view switch in the Stats Page, the transition should use fluid Framer Motion animations and maintain data consistency across views
**Validates: Requirements 4.2**

#### Property 8: Multi-Source Data Integration
*For any* Stats Page view, the system should successfully pull and display data from tasks, habits, calendars, and custom widgets without data loss
**Validates: Requirements 4.4**

#### Property 9: Responsive Layout Adaptation
*For any* device screen size, the Stats Page should adapt its layout while maintaining functionality and readability
**Validates: Requirements 4.5**

#### Property 10: Real-Time Metric Updates
*For any* task completion or habit update, the Daily Snapshot View should immediately reflect the changes in focus time, completed tasks, and streak counters
**Validates: Requirements 5.5**

#### Property 11: Gamification Progress Tracking
*For any* productivity milestone reached, the Gamified Progress View should correctly update pet/character level, award appropriate badges, and trigger celebratory animations
**Validates: Requirements 8.1, 8.2, 8.4**

#### Property 12: Streak Calculation Accuracy
*For any* sequence of habit or task completions, the system should accurately calculate and display current streaks, longest streaks, and streak history
**Validates: Requirements 8.3**

#### Property 13: Widget Customization Persistence
*For any* widget configuration change in the Custom Insight View, the system should save the settings and maintain them across sessions, including drag-and-drop arrangements
**Validates: Requirements 9.1, 9.5**

#### Property 14: AI Insight Generation
*For any* user with sufficient historical data, the AI system should generate meaningful productivity patterns, behavioral trends, and optimization suggestions
**Validates: Requirements 9.3, 9.4**

#### Property 15: Hyperfocus Mode Minimalism
*For any* user entering Hyperfocus Mode, the interface should display only essential metrics (streak, goal, timer) with minimal text and no distracting animations
**Validates: Requirements 10.1, 10.2, 10.4**

#### Property 16: Chart Interactivity and Theming
*For any* chart displayed in the Stats Page, it should support hover tooltips, zoom/pan/filter interactions, and adapt colors to the current theme
**Validates: Requirements 11.1, 11.4, 11.5**

#### Property 17: Comprehensive Accessibility Support
*For any* user interaction with the Stats Page, keyboard shortcuts, gesture support, voice commands, and screen reader compatibility should function correctly
**Validates: Requirements 12.1, 12.2, 12.3, 12.6**

#### Property 18: Accessibility Customization
*For any* user with accessibility needs, the system should provide color-blind friendly palettes, high contrast modes, and animation reduction options that take effect immediately
**Validates: Requirements 12.4, 12.5**

#### Property 19: Data Export Consistency
*For any* export request from the Monthly Analytics View, the system should generate accurate data in the requested format (PDF, CSV, JSON) without data corruption
**Validates: Requirements 7.5**

#### Property 20: Chart Type and Data Accuracy
*For any* analytics view requiring charts, the system should display the correct chart types (line/bar for trends, progress rings for completion) with accurate data representation
**Validates: Requirements 6.1, 6.2, 11.2**

## Testing Strategy

### Dual Testing Approach

This feature requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and error conditions
- Component rendering with specific props
- Theme switching edge cases  
- Data export format validation
- Accessibility compliance verification
- Integration points between components

**Property Tests**: Verify universal properties across all inputs
- Status indicator consistency across all task types
- Theme adaptation across all visual elements
- Real-time updates across all metric types
- Chart rendering across all data sets
- Accessibility features across all interaction modes

### Property-Based Testing Configuration

**Testing Framework**: Use `fast-check` for TypeScript/React property-based testing
**Test Configuration**: Minimum 100 iterations per property test
**Test Tagging**: Each property test must reference its design document property

Example test tag format:
```typescript
// Feature: adhd-ui-enhancements, Property 1: Status Indicator Consistency
```

### Testing Implementation Strategy

**Component-Level Testing**:
- StatusIcon component with all status combinations
- EventCard component with various event durations and themes
- WontDoTab component with different task collections
- Chart components with various data sets and themes

**Integration Testing**:
- Cross-view status synchronization
- Theme changes affecting multiple components
- Data flow from backend to visualization components
- Real-time updates propagating through the system

**Accessibility Testing**:
- Keyboard navigation through all Stats Page views
- Screen reader compatibility with all interactive elements
- Color contrast validation in all theme modes
- Animation reduction functionality

**Performance Testing**:
- Chart rendering with large datasets
- Real-time update performance with high task volumes
- Memory usage during extended Stats Page sessions
- Mobile gesture responsiveness

### Error Handling and Edge Cases

**Data Handling**:
- Empty datasets for chart rendering
- Malformed task data for status indicators
- Network failures during AI insight generation
- Corrupted user preferences for customization

**UI Resilience**:
- Extremely long task titles in event cards
- Rapid theme switching
- Simultaneous view transitions
- Device orientation changes during chart interactions

**Accessibility Edge Cases**:
- High contrast mode with custom themes
- Screen reader navigation with dynamic content updates
- Keyboard shortcuts conflicting with browser shortcuts
- Voice command recognition in noisy environments