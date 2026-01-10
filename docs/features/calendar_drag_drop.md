# Calendar Drag and Drop Guide

NovaDo features a powerful drag-and-drop system for managing tasks directly on the calendar. This guide explains how to use it and the underlying behavior.

## 🎯 Features

-   **Cross-View Support**: Drag tasks in Month, Week, Day, and Agenda views.
-   **Smart Time Translation**: Automatically adjusts times when moving between slots.
-   **Theme Aware**: Visual feedback adapts to your current theme (Light, Dark, or Hacker).

## 🖱️ How to Use

### Month View
-   **Move Date**: Drag a task from one day cell to another.
-   **Preserve Time**: The task's original time is kept; only the date changes.

### Week View
-   **Change Date & Time**: Drag a task to a specific day and time slot.
-   **Precision**: Snaps to nearest 15-minute intervals.

### Day View
-   **Fine Adjustment**: Move tasks within the daily timeline.
-   **Visual Feedback**: Hour slots light up as you drag over them.

### Agenda View
-   **Reschedule**: Drag a task card to a different date header to reschedule it for that day.

## ⚙️ Behavior Details

### Time Zone & Format
The system handles various time formats, ensuring that synced Google Calendar events (`2023-10-27T10:00:00Z`) and local tasks (`10:00`) are handled correctly.

### Visual Cues
-   **Dragging**: The card tilts slightly and lifts up (shadow effect).
-   **Drop Zone**: Valid drop areas are highlighted.
-   **Cursor**: Changes to "grabbing" to indicate active state.

## 📱 Mobile Support
Touch interactions are fully supported. Long-press a task to "pick it up," then drag it to the desired location.