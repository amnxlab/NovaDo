# Implementation Plan: Task Matrix Banner

## Overview

Implement a customizable banner image feature for the Task Matrix view with upload, focal point adjustment, and persistence capabilities.

## Tasks

- [x] 1. Backend: Add banner upload and settings endpoints
  - [x] 1.1 Create banner upload endpoint in routes
    - Add `POST /api/user/banner` endpoint
    - Handle multipart file upload
    - Validate file type (JPEG, PNG, WebP, GIF)
    - Validate file size (max 5MB)
    - Save to `uploads/banners/{user_id}_{timestamp}.{ext}`
    - Return banner URL
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 1.2 Create banner settings endpoint
    - Add `PUT /api/user/banner/settings` endpoint
    - Accept focal point coordinates (x, y as 0-100)
    - Validate and clamp coordinates to valid range
    - Store in user document
    - _Requirements: 3.3, 5.2_

  - [x] 1.3 Create banner removal endpoint
    - Add `DELETE /api/user/banner` endpoint
    - Delete image file from disk
    - Clear banner settings from user document
    - _Requirements: 4.1, 4.3_

  - [x] 1.4 Extend user settings response
    - Add `bannerUrl`, `bannerFocalX`, `bannerFocalY` to user settings response
    - Return defaults (null, 50, 50) if not set
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. Frontend: Add banner display component
  - [x] 2.1 Add banner HTML structure to Task Matrix
    - Add banner container div above view switcher
    - Add image element with object-fit: cover
    - Add edit/remove buttons (visible on hover)
    - Add default gradient background
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 2.2 Add banner CSS styles
    - Style banner container with 4:1 aspect ratio
    - Style image with object-fit and object-position
    - Style edit/remove buttons
    - Style default gradient placeholder
    - Add responsive styles for mobile
    - _Requirements: 1.4, 1.5_

  - [x] 2.3 Load and display user's banner on init
    - Fetch user settings on Task Matrix load
    - Apply banner URL if set
    - Apply focal point as object-position
    - Show default if no custom banner
    - _Requirements: 1.2, 5.3_

- [x] 3. Frontend: Implement banner upload functionality
  - [x] 3.1 Add file input and upload handler
    - Add hidden file input element
    - Trigger on edit button click
    - Validate file type and size client-side
    - Show error messages for invalid files
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 3.2 Implement upload API call
    - Create FormData with file
    - POST to /api/user/banner
    - Handle success: update banner display
    - Handle error: show error message
    - _Requirements: 2.3, 2.5_

- [x] 4. Frontend: Implement focal point editor
  - [x] 4.1 Create focal point edit modal
    - Show full image in modal
    - Add draggable focal point indicator (crosshair/circle)
    - Show preview of cropped result
    - Add save/cancel buttons
    - _Requirements: 3.1_

  - [x] 4.2 Implement drag functionality
    - Handle mousedown/touchstart to start drag
    - Handle mousemove/touchmove to update position
    - Handle mouseup/touchend to end drag
    - Constrain to image bounds
    - Update preview in real-time
    - _Requirements: 3.2_

  - [x] 4.3 Save focal point settings
    - Convert pixel position to percentage
    - Call PUT /api/user/banner/settings
    - Update banner display with new focal point
    - Close modal on success
    - _Requirements: 3.3, 3.4, 3.5_

- [x] 5. Frontend: Implement banner removal
  - [x] 5.1 Add remove button handler
    - Show confirmation dialog
    - Call DELETE /api/user/banner
    - Reset to default gradient on success
    - _Requirements: 4.1, 4.2_

- [x] 6. Checkpoint - Test all functionality
  - All 8 tests pass (property tests + unit tests)

- [x] 6.1 Write property test for focal point bounds
  - **Property 2: Focal Point Coordinate Bounds**
  - **Validates: Requirements 3.3, 5.2**

- [x] 6.2 Write property test for CSS mapping
  - **Property 3: Focal Point to CSS Mapping**
  - **Validates: Requirements 3.4, 3.5**

- [x] 6.3 Write property test for file size validation
  - **Property 4: File Size Validation**
  - **Validates: Requirements 2.4**

## Notes

- LinkedIn banner dimensions: 1584x396px (4:1 ratio)
- Default focal point: center (50%, 50%)
- Max file size: 5MB
- Supported formats: JPEG, PNG, WebP, GIF
