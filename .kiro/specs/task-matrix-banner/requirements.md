# Requirements Document

## Introduction

This feature adds a customizable banner image to the Task Matrix view, allowing users to personalize their workspace with a header image. The banner follows LinkedIn banner dimensions (1584x396px) as the default aspect ratio but allows users to upload any image size and adjust the focal point for optimal display.

## Glossary

- **Banner_Image**: A header image displayed at the top of the Task Matrix view
- **Focal_Point**: The center point of interest in an image that determines how the image is cropped/positioned
- **Task_Matrix**: The productivity view showing tasks organized in Eisenhower matrix, Kanban, List, or Dashboard layouts
- **User_Settings**: Per-user configuration stored in the database

## Requirements

### Requirement 1: Display Banner Image

**User Story:** As a user, I want to see a banner image at the top of my Task Matrix view, so that I can personalize my workspace.

#### Acceptance Criteria

1. WHEN the Task Matrix view loads, THE System SHALL display a banner area at the top of the view
2. WHEN a user has set a custom banner image, THE System SHALL display that image in the banner area
3. WHEN a user has no custom banner image, THE System SHALL display a default gradient or placeholder
4. THE Banner_Image SHALL maintain a 4:1 aspect ratio (LinkedIn banner style: 1584x396px equivalent)
5. THE Banner_Image SHALL be responsive and scale appropriately on different screen sizes

### Requirement 2: Upload Banner Image

**User Story:** As a user, I want to upload my own banner image, so that I can customize my Task Matrix appearance.

#### Acceptance Criteria

1. WHEN a user clicks on the banner area or an edit button, THE System SHALL open an image upload dialog
2. WHEN a user selects an image file, THE System SHALL accept common image formats (JPEG, PNG, WebP, GIF)
3. WHEN an image is uploaded, THE System SHALL store it on the server and associate it with the user
4. IF an uploaded image exceeds 5MB, THEN THE System SHALL display an error message
5. WHEN upload is successful, THE System SHALL immediately display the new banner image

### Requirement 3: Adjust Focal Point

**User Story:** As a user, I want to adjust the focal point of my banner image, so that the most important part of the image is visible.

#### Acceptance Criteria

1. WHEN a user enters edit mode for the banner, THE System SHALL display the full image with a draggable focal point indicator
2. WHEN a user drags the focal point, THE System SHALL update the preview in real-time
3. WHEN a user saves the focal point, THE System SHALL persist the focal point coordinates (x%, y%)
4. THE System SHALL use the focal point to determine `object-position` CSS property for image display
5. WHEN displaying the banner, THE System SHALL crop/position the image based on the saved focal point

### Requirement 4: Remove Banner Image

**User Story:** As a user, I want to remove my custom banner image, so that I can return to the default appearance.

#### Acceptance Criteria

1. WHEN a user clicks a remove/reset button in banner edit mode, THE System SHALL remove the custom banner
2. WHEN the banner is removed, THE System SHALL display the default gradient/placeholder
3. WHEN the banner is removed, THE System SHALL delete the stored image file from the server

### Requirement 5: Persist Banner Settings

**User Story:** As a user, I want my banner settings to persist across sessions, so that I don't have to reconfigure them each time.

#### Acceptance Criteria

1. WHEN a user sets a banner image, THE System SHALL store the image URL in the user's settings
2. WHEN a user sets a focal point, THE System SHALL store the coordinates in the user's settings
3. WHEN the user logs in on any device, THE System SHALL load and display their saved banner settings
