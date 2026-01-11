# Requirements Document

## Introduction

This document specifies the requirements for fixing three UI bugs in the NovaDo application:
1. Sidebar resizing capability
2. Sidebar drag-and-drop reordering not completing drops
3. Task Matrix not following the color theme

## Glossary

- **Sidebar**: The fixed left navigation panel containing smart lists, tools, and custom lists
- **Resize_Handle**: A draggable element that allows users to adjust the sidebar width
- **Nav_Item**: A navigation item in the sidebar (smart list, tool, or custom list)
- **Task_Matrix**: The Eisenhower matrix view for task prioritization
- **Theme**: The visual color scheme applied to the application (light, dark, hacker)

## Requirements

### Requirement 1: Sidebar Resizing

**User Story:** As a user, I want to resize the sidebar, so that I can fit more screen elements or see more content in the main area.

#### Acceptance Criteria

1. THE Sidebar SHALL display a Resize_Handle on its right edge
2. WHEN a user drags the Resize_Handle, THE Sidebar SHALL resize horizontally following the cursor position
3. THE Sidebar SHALL have a minimum width of 200px to ensure usability
4. THE Sidebar SHALL have a maximum width of 400px to prevent excessive space usage
5. WHEN the sidebar is resized, THE Main_Content area SHALL adjust its left margin accordingly
6. WHEN the user releases the Resize_Handle, THE System SHALL persist the sidebar width to localStorage
7. WHEN the application loads, THE System SHALL restore the previously saved sidebar width from localStorage

### Requirement 2: Sidebar Drag-and-Drop Reordering Fix

**User Story:** As a user, I want to drag and drop sidebar items to reorder them, so that I can organize my navigation according to my preferences.

#### Acceptance Criteria

1. WHEN a user drags a Nav_Item, THE System SHALL visually indicate the item is being dragged
2. WHEN a user drags a Nav_Item over other items, THE System SHALL show a visual drop indicator at the insertion point
3. WHEN a user drops a Nav_Item, THE System SHALL reorder the items and persist the new order
4. IF a drag operation is cancelled, THEN THE System SHALL restore the original order
5. THE drag-and-drop functionality SHALL work for smart lists, tools, and custom lists sections

### Requirement 3: Task Matrix Theme Compliance

**User Story:** As a user, I want the Task Matrix to follow my selected color theme, so that I have a consistent visual experience across the application.

#### Acceptance Criteria

1. WHEN the hacker theme is active, THE Task_Matrix SHALL use the hacker theme color variables
2. WHEN the dark theme is active, THE Task_Matrix SHALL use the dark theme color variables
3. WHEN the light theme is active, THE Task_Matrix SHALL use the light theme color variables
4. THE Task_Matrix quadrant backgrounds SHALL adapt to the current theme
5. THE Task_Matrix task cards SHALL use theme-appropriate text and border colors
6. THE Task_Matrix filter bar SHALL use theme-appropriate styling
