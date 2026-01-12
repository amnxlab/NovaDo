# Implementation Plan: Matrix View Page Isolation Fix

## Overview

This implementation plan addresses the page isolation bug where Matrix view elements appear in Smart List views. The fix involves enhancing CSS rules, improving JavaScript cleanup functions, and adding validation checks to ensure complete view isolation.

## Tasks

- [x] 1. Enhance CSS isolation rules for Matrix view
  - Update `#matrix-view.hidden` styles in `static/css/taskMatrix.css`
  - Add `contain: strict` property for layout isolation
  - Add individual element hiding rules for banner, header, filter-bar, container
  - Ensure all child elements are hidden with `!important` declarations
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2. Improve cleanupMatrixElements function
  - [x] 2.1 Refactor cleanupMatrixElements() in `static/js/app.js`
    - Add comprehensive list of Matrix-specific CSS selectors
    - Iterate through all non-matrix views to remove orphaned elements
    - Add parent validation to ensure Matrix elements stay in Matrix_View
    - Add inline style hiding as fallback when CSS classes fail
    - _Requirements: 4.5, 5.5, 2.3_

  - [ ]* 2.2 Write property test for orphaned element removal
    - **Property 6: Orphaned Element Removal**
    - Test that Matrix elements placed outside Matrix_View are removed by cleanup
    - **Validates: Requirements 4.5, 5.5**

- [x] 3. Enhance view switching functions
  - [x] 3.1 Update showView() function in `static/js/app.js`
    - Ensure all views are hidden before showing target view
    - Call clearMatrixContainers() before cleanup
    - Add validation that Matrix_View is properly hidden
    - _Requirements: 4.1, 1.1_

  - [x] 3.2 Update selectSmartList() function in `static/js/app.js`
    - Clear Matrix containers at start of function
    - Call cleanupMatrixElements() before rendering tasks
    - Verify Tasks_View is clean before rendering
    - _Requirements: 4.2, 2.1, 2.2_

  - [x] 3.3 Update selectCustomList() function in `static/js/app.js`
    - Apply same cleanup pattern as selectSmartList()
    - Clear Matrix containers and run cleanup
    - _Requirements: 4.3_

  - [ ]* 3.4 Write property test for view hiding on switch
    - **Property 4: View Hiding on Switch**
    - Test that all non-target views have hidden class after showView()
    - **Validates: Requirements 4.1**

- [x] 4. Add clearMatrixContainers helper function
  - Create new helper function in `static/js/app.js`
  - Clear innerHTML of matrix-header, matrix-filter-bar, matrix-view-container
  - Hide matrix-banner with display:none
  - Add inline styles as fallback
  - _Requirements: 4.2, 4.3, 1.2, 1.3, 1.4, 1.5_

- [x] 5. Enhance renderTasks function
  - [x] 5.1 Add pre-render validation in renderTasks()
    - Check Tasks_View doesn't contain Matrix elements before rendering
    - Call cleanupMatrixElements() at start of function
    - Log warning if orphaned elements found
    - _Requirements: 4.4, 2.1_

  - [ ]* 5.2 Write property test for Tasks_View isolation
    - **Property 2: Tasks_View Isolation Invariant**
    - Test that Tasks_View never contains Matrix elements after navigation
    - **Validates: Requirements 2.1, 2.2, 4.4**

- [x] 6. Add Matrix element containment validation
  - [x] 6.1 Add containment check in cleanupMatrixElements()
    - Verify banner, header, filter-bar, container have Matrix_View as parent
    - Remove elements that are outside their proper container
    - _Requirements: 2.4, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.2 Write property test for element containment
    - **Property 3: Matrix Element Containment**
    - Test that Matrix elements always have Matrix_View as parent
    - **Validates: Requirements 2.4, 5.1, 5.2, 5.3, 5.4**

- [x] 7. Checkpoint - Ensure all tests pass
  - Core implementation complete, optional property tests skipped per user request.

- [ ] 8. Add integration tests for navigation scenarios
  - [ ]* 8.1 Write property test for Matrix child visibility
    - **Property 1: Matrix Child Visibility When Hidden**
    - Test that Matrix children have display:none when Matrix_View is hidden
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**

  - [ ]* 8.2 Write property test for Smart List navigation isolation
    - **Property 7: Smart List Navigation Isolation**
    - Test navigation from Matrix to Smart Lists shows only Smart List content
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [ ]* 8.3 Write property test for round-trip navigation
    - **Property 8: Round-Trip Navigation Consistency**
    - Test Matrix → Smart List → Matrix renders Matrix correctly
    - **Validates: Requirements 6.5**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Core implementation complete.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The fix uses a defense-in-depth approach: CSS + JavaScript + DOM validation
