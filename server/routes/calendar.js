const express = require('express');
const router = express.Router();
const passport = require('passport');
const { google } = require('googleapis');
const Task = require('../models/Task');
const List = require('../models/List');

const auth = passport.authenticate('jwt', { session: false });

// Helper to get OAuth2 client
const getOAuth2Client = (user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      user.googleRefreshToken = tokens.refresh_token;
    }
    user.googleAccessToken = tokens.access_token;
    await user.save();
  });

  return oauth2Client;
};

// Check if Google Calendar is connected
router.get('/status', auth, async (req, res) => {
  try {
    const isConnected = !!(req.user.googleAccessToken && req.user.googleRefreshToken);
    
    res.json({
      connected: isConnected,
      email: isConnected ? req.user.email : null
    });
  } catch (error) {
    console.error('Calendar status error:', error);
    res.status(500).json({ error: { message: 'Failed to check calendar status' } });
  }
});

// Import events from Google Calendar
router.post('/import', auth, async (req, res) => {
  try {
    if (!req.user.googleAccessToken || !req.user.googleRefreshToken) {
      return res.status(400).json({ error: { message: 'Google Calendar not connected' } });
    }

    const oauth2Client = getOAuth2Client(req.user);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get events from the past week to next month
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 7);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 1);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];

    // Get or create "Calendar" list
    let calendarList = await List.findOne({
      user: req.user._id,
      name: 'Calendar'
    });

    if (!calendarList) {
      calendarList = new List({
        user: req.user._id,
        name: 'Calendar',
        icon: 'calendar',
        color: '#1890ff'
      });
      await calendarList.save();
    }

    // Import events as tasks
    const importedTasks = [];
    for (const event of events) {
      // Skip if already imported
      const existingTask = await Task.findOne({
        user: req.user._id,
        googleCalendarEventId: event.id
      });

      if (existingTask) continue;

      // Create task from event
      const task = new Task({
        user: req.user._id,
        list: calendarList._id,
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        dueDate: event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date),
        dueTime: event.start.dateTime ? new Date(event.start.dateTime).toTimeString().slice(0, 5) : null,
        googleCalendarEventId: event.id,
        syncedWithGoogle: true
      });

      await task.save();
      importedTasks.push(task);
    }

    res.json({
      message: `Imported ${importedTasks.length} events`,
      count: importedTasks.length,
      tasks: importedTasks
    });
  } catch (error) {
    console.error('Import calendar error:', error);
    res.status(500).json({ error: { message: 'Failed to import calendar events' } });
  }
});

// Export task to Google Calendar
router.post('/export/:taskId', auth, async (req, res) => {
  try {
    if (!req.user.googleAccessToken || !req.user.googleRefreshToken) {
      return res.status(400).json({ error: { message: 'Google Calendar not connected' } });
    }

    const task = await Task.findOne({
      _id: req.params.taskId,
      user: req.user._id
    });

    if (!task) {
      return res.status(404).json({ error: { message: 'Task not found' } });
    }

    const oauth2Client = getOAuth2Client(req.user);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Prepare event
    const event = {
      summary: task.title,
      description: task.description,
      start: {},
      end: {}
    };

    if (task.dueDate) {
      const startDate = new Date(task.dueDate);
      
      if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(':');
        startDate.setHours(parseInt(hours), parseInt(minutes));
        event.start.dateTime = startDate.toISOString();
        
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
        event.end.dateTime = endDate.toISOString();
        event.start.timeZone = 'UTC';
        event.end.timeZone = 'UTC';
      } else {
        event.start.date = startDate.toISOString().split('T')[0];
        event.end.date = startDate.toISOString().split('T')[0];
      }
    } else {
      const today = new Date();
      event.start.date = today.toISOString().split('T')[0];
      event.end.date = today.toISOString().split('T')[0];
    }

    // Create or update event
    let calendarEvent;
    if (task.googleCalendarEventId) {
      calendarEvent = await calendar.events.update({
        calendarId: 'primary',
        eventId: task.googleCalendarEventId,
        requestBody: event
      });
    } else {
      calendarEvent = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      });
      
      task.googleCalendarEventId = calendarEvent.data.id;
    }

    task.syncedWithGoogle = true;
    await task.save();

    res.json({
      message: 'Task exported to Google Calendar',
      eventId: calendarEvent.data.id,
      eventLink: calendarEvent.data.htmlLink
    });
  } catch (error) {
    console.error('Export to calendar error:', error);
    res.status(500).json({ error: { message: 'Failed to export to calendar' } });
  }
});

// Sync all tasks with Google Calendar
router.post('/sync', auth, async (req, res) => {
  try {
    if (!req.user.googleAccessToken || !req.user.googleRefreshToken) {
      return res.status(400).json({ error: { message: 'Google Calendar not connected' } });
    }

    const oauth2Client = getOAuth2Client(req.user);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get tasks that need syncing
    const tasks = await Task.find({
      user: req.user._id,
      status: 'active',
      dueDate: { $exists: true }
    });

    let synced = 0;
    for (const task of tasks) {
      try {
        const event = {
          summary: task.title,
          description: task.description,
          start: {},
          end: {}
        };

        const startDate = new Date(task.dueDate);
        
        if (task.dueTime) {
          const [hours, minutes] = task.dueTime.split(':');
          startDate.setHours(parseInt(hours), parseInt(minutes));
          event.start.dateTime = startDate.toISOString();
          
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 1);
          event.end.dateTime = endDate.toISOString();
          event.start.timeZone = 'UTC';
          event.end.timeZone = 'UTC';
        } else {
          event.start.date = startDate.toISOString().split('T')[0];
          event.end.date = startDate.toISOString().split('T')[0];
        }

        if (task.googleCalendarEventId) {
          await calendar.events.update({
            calendarId: 'primary',
            eventId: task.googleCalendarEventId,
            requestBody: event
          });
        } else {
          const calendarEvent = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event
          });
          
          task.googleCalendarEventId = calendarEvent.data.id;
        }

        task.syncedWithGoogle = true;
        await task.save();
        synced++;
      } catch (err) {
        console.error(`Failed to sync task ${task._id}:`, err);
      }
    }

    res.json({
      message: `Synced ${synced} tasks with Google Calendar`,
      count: synced
    });
  } catch (error) {
    console.error('Sync calendar error:', error);
    res.status(500).json({ error: { message: 'Failed to sync with calendar' } });
  }
});

// Delete event from Google Calendar
router.delete('/event/:taskId', auth, async (req, res) => {
  try {
    if (!req.user.googleAccessToken || !req.user.googleRefreshToken) {
      return res.status(400).json({ error: { message: 'Google Calendar not connected' } });
    }

    const task = await Task.findOne({
      _id: req.params.taskId,
      user: req.user._id
    });

    if (!task || !task.googleCalendarEventId) {
      return res.status(404).json({ error: { message: 'Calendar event not found' } });
    }

    const oauth2Client = getOAuth2Client(req.user);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: task.googleCalendarEventId
    });

    task.googleCalendarEventId = null;
    task.syncedWithGoogle = false;
    await task.save();

    res.json({ message: 'Event deleted from Google Calendar' });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ error: { message: 'Failed to delete calendar event' } });
  }
});

module.exports = router;

