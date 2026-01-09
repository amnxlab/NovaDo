import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert
} from '@mui/material';
import {
  Sync as SyncIcon,
  CloudDownload as ImportIcon,
  CloudUpload as ExportIcon
} from '@mui/icons-material';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { fetchTasks } from '../store/slices/tasksSlice';
import { format, isSameDay } from 'date-fns';
import api from '../services/api';
import { toast } from 'react-toastify';

const CalendarPage = () => {
  const dispatch = useDispatch();
  const { items: tasks } = useSelector((state) => state.tasks);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    dispatch(fetchTasks());
    checkGoogleConnection();
  }, [dispatch]);

  const checkGoogleConnection = async () => {
    try {
      const response = await api.get('/calendar/status');
      setGoogleConnected(response.data.connected);
    } catch (error) {
      console.error('Failed to check Google Calendar status:', error);
    }
  };

  const handleImportFromGoogle = async () => {
    setSyncing(true);
    try {
      const response = await api.post('/calendar/import');
      toast.success(`Imported ${response.data.count} events from Google Calendar`);
      dispatch(fetchTasks());
    } catch (error) {
      toast.error('Failed to import from Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncWithGoogle = async () => {
    setSyncing(true);
    try {
      const response = await api.post('/calendar/sync');
      toast.success(`Synced ${response.data.count} tasks with Google Calendar`);
    } catch (error) {
      toast.error('Failed to sync with Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  const tasksForSelectedDate = tasks.filter((task) =>
    task.dueDate && isSameDay(new Date(task.dueDate), selectedDate)
  );

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayTasks = tasks.filter(
        (task) => task.dueDate && isSameDay(new Date(task.dueDate), date)
      );
      if (dayTasks.length > 0) {
        return (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mt: 0.5
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'primary.main'
              }}
            />
          </Box>
        );
      }
    }
    return null;
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Calendar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage your tasks by date
          </Typography>
        </Box>
      </Box>

      {!googleConnected && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Connect your Google account in Settings to sync with Google Calendar
        </Alert>
      )}

      {googleConnected && (
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={handleImportFromGoogle}
            disabled={syncing}
          >
            Import from Google
          </Button>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={handleSyncWithGoogle}
            disabled={syncing}
          >
            Sync with Google
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Card sx={{ flexGrow: 1 }}>
          <CardContent>
            <Box
              sx={{
                '& .react-calendar': {
                  width: '100%',
                  border: 'none',
                  fontFamily: 'inherit'
                },
                '& .react-calendar__tile--active': {
                  background: '#1890ff',
                  color: 'white'
                },
                '& .react-calendar__tile--now': {
                  background: '#e6f7ff'
                }
              }}
            >
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileContent={tileContent}
              />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ width: { xs: '100%', md: 400 } }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {format(selectedDate, 'MMMM dd, yyyy')}
            </Typography>

            {tasksForSelectedDate.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                No tasks scheduled for this day
              </Typography>
            ) : (
              <List>
                {tasksForSelectedDate.map((task) => (
                  <ListItem key={task._id} divider>
                    <ListItemText
                      primary={task.title}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          {task.dueTime && (
                            <Chip label={task.dueTime} size="small" />
                          )}
                          {task.priority !== 'none' && (
                            <Chip
                              label={task.priority}
                              size="small"
                              color={
                                task.priority === 'high'
                                  ? 'error'
                                  : task.priority === 'medium'
                                  ? 'warning'
                                  : 'info'
                              }
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default CalendarPage;

