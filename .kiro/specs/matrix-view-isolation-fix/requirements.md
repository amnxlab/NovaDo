# Requirements Document

## Introduction

This document specifies the requirements for fixing a page isolation bug in the NovaDo application where Task Matrix view elements (banner, header, filter bar) incorrectly appear at the bottom of Smart List views (Inbox, Today, Next 7 Days, All Tasks, etc.) when navigating away from the Matrix view.

## Glossary

- **Matrix_View**: The Task Matrix view component (`#matrix-view`) that displays tasks in Kanban/List/Dashboard formats with filtering capabilities
- **Matrix_Banner**: The user profile banner element (`#matrix-banner`) containing user settings and profile image
- **Matrix_Header**: The view switcher header (`#matrix-header`) containing Kanban/List/Dashboard navigation buttons
- **Matrix_Filter_Bar**: The filter controls (`#matrix-filter-bar`) for filtering tasks by priority, status, tags, and energy level
- **Matrix_Container**: The main content container (`#matrix-view-container`) that holds the rendered view content
- **Smart_List_View**: Any of the task list views including Inbox, Today, Next 7 Days, All Tasks, Completed, Won't Do
- **Tasks_View**: The container (`#tasks-view`) that displays Smart List content
- **View_Isolation**: The principle that each view's content should be completely contained within its own container and not visible in other views

## Requirements

### Requirement 1: Complete Matrix View Hiding

**User Story:** As a user, I want the Matrix view to be completely hidden when I navigate to other views, so that I don't see Matrix elements in unrelated views.

#### Acceptance Criteria

1. WHEN the user navigates away from Matrix view to any Smart List view, THE Matrix_View SHALL be completely hidden with no visible elements
2. WHEN the Matrix_View is hidden, THE Matrix_Banner SHALL not be visible in any other view
3. WHEN the Matrix_View is hidden, THE Matrix_Header SHALL not be visible in any other view
4. WHEN the Matrix_View is hidden, THE Matrix_Filter_Bar SHALL not be visible in any other view
5. WHEN the Matrix_View is hidden, THE Matrix_Container SHALL not be visible in any other view

### Requirement 2: View Container Isolation

**User Story:** As a user, I want each view to display only its own content, so that I have a clean and uncluttered interface.

#### Acceptance Criteria

1. THE Tasks_View SHALL only contain task list elements and never contain Matrix view elements
2. WHEN rendering Smart List content, THE System SHALL ensure no Matrix elements exist in the Tasks_View container
3. WHEN switching views, THE System SHALL clear any orphaned Matrix elements from non-Matrix view containers
4. THE Matrix_Banner, Matrix_Header, Matrix_Filter_Bar, and Matrix_Container SHALL only exist as children of Matrix_View

### Requirement 3: CSS-Based View Isolation

**User Story:** As a developer, I want CSS rules to enforce view isolation, so that hidden views cannot accidentally display content.

#### Acceptance Criteria

1. WHEN Matrix_View has the `hidden` class, THE CSS SHALL set `display: none !important` on the Matrix_View
2. WHEN Matrix_View has the `hidden` class, THE CSS SHALL hide all child elements of Matrix_View
3. THE CSS SHALL prevent any Matrix view elements from being visible outside their parent container
4. WHEN a view has the `hidden` class, THE view and all its children SHALL have `visibility: hidden` and `pointer-events: none`

### Requirement 4: JavaScript Cleanup on View Switch

**User Story:** As a user, I want view switching to be clean and reliable, so that I never see content from previous views.

#### Acceptance Criteria

1. WHEN `showView()` is called, THE System SHALL hide all views before showing the target view
2. WHEN `selectSmartList()` is called, THE System SHALL clear all Matrix view containers
3. WHEN `selectCustomList()` is called, THE System SHALL clear all Matrix view containers
4. WHEN `renderTasks()` is called, THE System SHALL verify no Matrix elements exist in the Tasks_View before rendering
5. THE `cleanupMatrixElements()` function SHALL remove any Matrix elements found outside the Matrix_View container

### Requirement 5: Proper Element Containment

**User Story:** As a developer, I want Matrix elements to stay within their proper container, so that DOM manipulation doesn't cause content bleeding.

#### Acceptance Criteria

1. THE Matrix_Banner SHALL always remain a direct child of Matrix_View
2. THE Matrix_Header SHALL always remain a direct child of Matrix_View
3. THE Matrix_Filter_Bar SHALL always remain a direct child of Matrix_View
4. THE Matrix_Container SHALL always remain a direct child of Matrix_View
5. IF any Matrix element is found outside Matrix_View, THEN THE System SHALL either move it back or remove it

### Requirement 6: Navigation Consistency

**User Story:** As a user, I want to navigate between views without visual glitches, so that I have a smooth user experience.

#### Acceptance Criteria

1. WHEN navigating from Matrix view to Inbox, THE System SHALL display only Inbox content
2. WHEN navigating from Matrix view to Today, THE System SHALL display only Today content
3. WHEN navigating from Matrix view to any Smart List, THE System SHALL display only that Smart List's content
4. WHEN navigating from Matrix view to a Custom List, THE System SHALL display only that Custom List's content
5. WHEN navigating back to Matrix view after visiting Smart Lists, THE Matrix view SHALL render correctly
