# Design Document: Task Matrix Banner

## Overview

This feature adds a customizable banner image to the Task Matrix view header. Users can upload their own images, adjust the focal point for optimal cropping, and have their settings persist across sessions. The banner uses LinkedIn-style dimensions (4:1 aspect ratio) and supports responsive display.

## Architecture

The feature follows the existing NovaDo architecture:
- **Frontend**: JavaScript (app.js/taskMatrix.js) + CSS for UI
- **Backend**: Python FastAPI for image upload/storage endpoints
- **Storage**: File system (`uploads/banners/`) for images, MongoDB for user settings

```
┌─────────────────────────────────────────────────────────────┐
│                    Task Matrix View                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Banner Image (4:1 ratio)                │    │
│  │         [Edit Button] [Remove Button]                │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              View Switcher Tabs                      │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Filter Bar                              │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Task Content Area                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Frontend Components

#### 1. MatrixBanner Component
```javascript
// Banner display and edit functionality
const MatrixBanner = {
    element: null,           // Banner container element
    imageUrl: null,          // Current banner image URL
    focalPoint: {x: 50, y: 50}, // Focal point as percentages
    isEditing: false,        // Edit mode state
    
    init(),                  // Initialize banner
    render(),                // Render banner HTML
    loadSettings(),          // Load user's banner settings
    saveSettings(),          // Save banner settings to server
    uploadImage(file),       // Upload new banner image
    removeBanner(),          // Remove custom banner
    setFocalPoint(x, y),     // Set focal point coordinates
    enterEditMode(),         // Enter focal point edit mode
    exitEditMode()           // Exit edit mode
};
```

#### 2. FocalPointEditor Component
```javascript
// Draggable focal point editor
const FocalPointEditor = {
    isDragging: false,
    startX: 0,
    startY: 0,
    
    init(container, onUpdate),  // Initialize editor
    handleMouseDown(e),         // Start drag
    handleMouseMove(e),         // Update position
    handleMouseUp(e),           // End drag
    updatePreview(x, y)         // Update preview in real-time
};
```

### Backend Endpoints

#### Upload Banner Image
```
POST /api/user/banner
Content-Type: multipart/form-data

Request:
- file: Image file (JPEG, PNG, WebP, GIF)
- Max size: 5MB

Response:
{
    "success": true,
    "bannerUrl": "/uploads/banners/{user_id}_{timestamp}.{ext}",
    "message": "Banner uploaded successfully"
}
```

#### Update Banner Settings
```
PUT /api/user/banner/settings
Content-Type: application/json

Request:
{
    "focalPointX": 50,  // 0-100 percentage
    "focalPointY": 50   // 0-100 percentage
}

Response:
{
    "success": true,
    "message": "Settings updated"
}
```

#### Remove Banner
```
DELETE /api/user/banner

Response:
{
    "success": true,
    "message": "Banner removed"
}
```

#### Get User Settings (existing endpoint, extended)
```
GET /api/user/settings

Response:
{
    ...existingSettings,
    "bannerUrl": "/uploads/banners/...",
    "bannerFocalX": 50,
    "bannerFocalY": 50
}
```

## Data Models

### User Settings Extension
```python
# Add to user settings in database
{
    "banner_url": str | None,      # URL to banner image
    "banner_focal_x": int,         # Focal point X (0-100), default 50
    "banner_focal_y": int          # Focal point Y (0-100), default 50
}
```

### File Storage
```
uploads/
└── banners/
    └── {user_id}_{timestamp}.{ext}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Banner URL Round-Trip Consistency
*For any* valid image URL stored as a user's banner, retrieving the user's settings should return the same URL that was stored.
**Validates: Requirements 1.2, 5.1**

### Property 2: Focal Point Coordinate Bounds
*For any* focal point coordinates set by a user, both X and Y values should be clamped to the range [0, 100] representing percentages.
**Validates: Requirements 3.3, 5.2**

### Property 3: Focal Point to CSS Mapping
*For any* focal point coordinates (x%, y%), the resulting CSS `object-position` property should be set to `{x}% {y}%`.
**Validates: Requirements 3.4, 3.5**

### Property 4: File Size Validation
*For any* uploaded file exceeding 5MB (5,242,880 bytes), the system should reject the upload with an error.
**Validates: Requirements 2.4**

### Property 5: Accepted File Types
*For any* uploaded file with MIME type in [image/jpeg, image/png, image/webp, image/gif], the system should accept the upload.
**Validates: Requirements 2.2**

## Error Handling

| Error Condition | User Message | Action |
|----------------|--------------|--------|
| File too large (>5MB) | "Image must be less than 5MB" | Reject upload, show error |
| Invalid file type | "Please upload a JPEG, PNG, WebP, or GIF image" | Reject upload, show error |
| Upload failed | "Failed to upload image. Please try again." | Show error, allow retry |
| Network error | "Connection error. Please check your internet." | Show error, allow retry |
| Settings save failed | "Failed to save settings. Please try again." | Show error, keep local state |

## Testing Strategy

### Unit Tests
- Test focal point coordinate clamping (0-100 range)
- Test CSS object-position generation from focal point
- Test file type validation
- Test file size validation

### Property-Based Tests
- **Property 1**: Generate random URLs, store and retrieve, verify equality
- **Property 2**: Generate random coordinates, verify clamping to [0, 100]
- **Property 3**: Generate random focal points, verify CSS output format
- **Property 4**: Generate files of various sizes, verify rejection above 5MB
- **Property 5**: Generate files with various MIME types, verify acceptance/rejection

### Integration Tests
- Upload image and verify it displays
- Set focal point and verify persistence across page reload
- Remove banner and verify default displays
- Test on multiple viewport sizes for responsiveness
