# Implementation Plan: UI Bug Fixes

## Overview

This plan implements three targeted bug fixes: sidebar resizing, drag-drop reordering, and Task Matrix theme compliance. Each fix is isolated to minimize risk of affecting other functionality.

## Tasks

- [x] 1. Implement Sidebar Resize Functionality
  - [x] 1.1 Add sidebar resize CSS styles
    - Add `.sidebar-resize-handle` styles to style.css
    - Add transition styles for smooth resizing
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Implement sidebar resize JavaScript logic
    - Create resize handle element dynamically
    - Add mouse event handlers for drag resize
    - Implement width bounds clamping (200-400px)
    - Update main content margin on resize
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - [x] 1.3 Add sidebar width persistence
    - Save width to localStorage on resize end
    - Load saved width on application init
    - _Requirements: 1.6, 1.7_
  - [ ]* 1.4 Write property test for sidebar width bounds
    - **Property 1: Sidebar Width Bounds**
    - **Validates: Requirements 1.3, 1.4**

- [x] 2. Fix Sidebar Drag-and-Drop Reordering
  - [x] 2.1 Fix handleSidebarDrop function
    - Ensure drop event properly saves new order
    - Add visual feedback during drag operations
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 2.2 Add drag-over visual indicator
    - Show insertion point indicator during drag
    - _Requirements: 2.2_
  - [x] 2.3 Ensure drag-drop works for all sections
    - Verify smart lists, tools, and custom lists all support reordering
    - _Requirements: 2.5_
  - [ ]* 2.4 Write property test for drag-drop order persistence
    - **Property 4: Drag-Drop Order Persistence**
    - **Validates: Requirements 2.3, 2.5**

- [x] 3. Checkpoint - Verify sidebar functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Fix Task Matrix Theme Compliance
  - [x] 4.1 Add hacker theme CSS variables for Task Matrix
    - Define hacker theme overrides in taskMatrix.css
    - Set appropriate colors for quadrants, cards, and filter bar
    - _Requirements: 3.1, 3.4, 3.5, 3.6_
  - [x] 4.2 Ensure dark theme Task Matrix styles are complete
    - Verify dark theme variables are properly applied
    - _Requirements: 3.2, 3.4, 3.5, 3.6_
  - [x] 4.3 Verify light theme Task Matrix styles
    - Ensure light theme defaults work correctly
    - _Requirements: 3.3, 3.4, 3.5, 3.6_
  - [ ]* 4.4 Write property test for theme variable inheritance
    - **Property 5: Task Matrix Theme Variable Inheritance**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

- [x] 5. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
