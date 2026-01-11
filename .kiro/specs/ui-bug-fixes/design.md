# Design Document: UI Bug Fixes

## Overview

This design addresses three UI bugs in the NovaDo application:
1. Adding sidebar resize functionality
2. Fixing sidebar drag-and-drop reordering
3. Ensuring Task Matrix follows the color theme

The implementation focuses on minimal, targeted changes to fix these specific issues without affecting other functionality.

## Architecture

The fixes are implemented across CSS and JavaScript files:

```
static/
├── css/
│   ├── style.css          # Sidebar resize styles, drag-drop fixes
│   └── taskMatrix.css     # Theme-specific Task Matrix styles
└── js/
    └── app.js             # Sidebar resize logic, drag-drop fix
```

## Components and Interfaces

### 1. Sidebar Resize Component

#### CSS Changes (style.css)

```css
/* Resize handle on sidebar right edge */
.sidebar-resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    width: 4px;
    height: 100%;
    cursor: ew-resize;
    background: transparent;
    transition: background var(--transition-fast);
    z-index: 101;
}

.sidebar-resize-handle:hover,
.sidebar-resize-handle.resizing {
    background: var(--accent-primary);
}

/* Sidebar needs position relative for handle */
.sidebar {
    position: fixed; /* already set */
    /* Add transition for smooth resize */
    transition: width var(--transition-fast);
}

/* Main content transition */
.main-content {
    transition: margin-left var(--transition-fast);
}
```

#### JavaScript Interface (app.js)

```javascript
// Sidebar resize state
const sidebarResizeState = {
    isResizing: false,
    startX: 0,
    startWidth: 0,
    minWidth: 200,
    maxWidth: 400
};

function initSidebarResize() {
    // Create and append resize handle
    // Setup mouse event listeners
    // Load saved width from localStorage
}

function handleResizeStart(e) {
    // Record starting position and width
}

function handleResizeMove(e) {
    // Calculate new width within bounds
    // Update sidebar and main content
}

function handleResizeEnd() {
    // Save width to localStorage
}
```

### 2. Drag-and-Drop Fix

The current implementation has the drag-and-drop handlers but the drop event doesn't properly complete the reorder. The fix ensures:

1. The `handleSidebarDrop` function correctly processes the drop
2. Visual feedback is provided during drag operations
3. The order is persisted after drop

#### Key Fix in handleSidebarDrop

The current code moves elements during `dragover` but the `drop` handler needs to ensure the final state is saved correctly.

### 3. Task Matrix Theme Compliance

#### CSS Changes (taskMatrix.css)

Add hacker theme support for Task Matrix components:

```css
/* Hacker theme for Task Matrix */
[data-theme="hacker"] {
    --matrix-bg: var(--bg-secondary);
    --matrix-card-bg: var(--bg-primary);
    --matrix-border: var(--border-color);
    --matrix-text: var(--text-primary);
    --matrix-text-secondary: var(--text-secondary);
    
    --quadrant-do-first: rgba(255, 51, 51, 0.15);
    --quadrant-schedule: rgba(0, 255, 0, 0.15);
    --quadrant-delegate: rgba(255, 255, 0, 0.15);
    --quadrant-eliminate: rgba(0, 170, 0, 0.1);
}

[data-theme="hacker"] .matrix-task-card {
    background: var(--matrix-card-bg);
    border-color: var(--matrix-border);
    color: var(--matrix-text);
}

[data-theme="hacker"] #matrix-filter-bar {
    background: var(--matrix-card-bg);
    border-color: var(--matrix-border);
}
```

## Data Models

### Sidebar Width Persistence

```javascript
// localStorage key: 'sidebarWidth'
// Value: number (pixels), e.g., 280
```

### Sidebar Config (existing)

```javascript
// localStorage key: 'sidebarConfig'
{
    smartLists: [{ id, icon, label, visible, customLabel }],
    tools: [{ id, icon, label, view, visible, customLabel }]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Sidebar Width Bounds

*For any* resize operation on the sidebar, the resulting width SHALL be between 200px (minimum) and 400px (maximum), inclusive.

**Validates: Requirements 1.3, 1.4**

### Property 2: Sidebar Width Persistence Round-Trip

*For any* valid sidebar width, saving to localStorage and then loading should produce the same width value.

**Validates: Requirements 1.6, 1.7**

### Property 3: Main Content Margin Consistency

*For any* sidebar width, the main content left margin SHALL equal the sidebar width.

**Validates: Requirements 1.5**

### Property 4: Drag-Drop Order Persistence

*For any* valid drag-drop reorder operation on sidebar items, the new order SHALL be persisted to localStorage and reflected in the DOM.

**Validates: Requirements 2.3, 2.5**

### Property 5: Task Matrix Theme Variable Inheritance

*For any* active theme (light, dark, hacker), the Task Matrix components SHALL use the CSS variables defined for that theme.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Error Handling

### Sidebar Resize
- If localStorage is unavailable, use default width (280px)
- If saved width is outside bounds, clamp to valid range

### Drag-and-Drop
- If drop target is invalid, cancel the operation
- If localStorage save fails, show error toast but keep DOM state

### Theme
- CSS variables cascade naturally; no explicit error handling needed

## Testing Strategy

### Unit Tests
- Test sidebar width clamping function
- Test localStorage save/load functions
- Test drag-drop order calculation

### Property-Based Tests
- Property 1: Generate random resize positions, verify width bounds
- Property 2: Generate random valid widths, verify round-trip
- Property 3: Generate random widths, verify margin consistency
- Property 4: Generate random reorder operations, verify persistence
- Property 5: Iterate through themes, verify CSS variable application

### Manual Testing
- Visual verification of resize handle appearance
- Drag-drop interaction testing across browsers
- Theme switching verification for Task Matrix
