import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  IconButton
} from '@mui/material';
import {
  TrendingUp as TrendingIcon,
  CheckCircle as CompletedIcon,
  Warning as OverdueIcon,
  CalendarToday as UpcomingIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { fetchTasks } from '../store/slices/tasksSlice';
import { fetchHabits } from '../store/slices/habitsSlice';
import { setPomodoroRunning, decrementPomodoroTime, setPomodoroTime } from '../store/slices/uiSlice';
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items: tasks } = useSelector((state) => state.tasks);
  const { items: habits } = useSelector((state) => state.habits);
  const { pomodoroRunning, pomodoroTime, pomodoroMode } = useSelector((state) => state.ui);
  
  const [stats, setStats] = useState({
    totalActive: 0,
    completedToday: 0,
    overdue: 0,
    upcoming: 0
  });

  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchHabits());
    fetchStats();
  }, [dispatch]);

  useEffect(() => {
    let interval;
    if (pomodoroRunning && pomodoroTime > 0) {
      interval = setInterval(() => {
        dispatch(decrementPomodoroTime());
      }, 1000);
    } else if (pomodoroTime === 0) {
      dispatch(setPomodoroRunning(false));
      // Play notification sound or show alert
      alert('Pomodoro session completed!');
    }
    return () => clearInterval(interval);
  }, [pomodoroRunning, pomodoroTime, dispatch]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/tasks/stats/summary');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePomodoroToggle = () => {
    dispatch(setPomodoroRunning(!pomodoroRunning));
  };

  const handlePomodoroReset = () => {
    dispatch(setPomodoroRunning(false));
    dispatch(setPomodoroTime(25 * 60));
  };

  const todayHabits = habits.filter(h => h.isActive);
  const completedHabitsToday = todayHabits.filter(h => {
    const today = new Date().toISOString().split('T')[0];
    return h.completions.some(c => c.date.startsWith(today));
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Welcome back, {user?.name}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's your productivity overview
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Active Tasks
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {stats.totalActive}
                  </Typography>
                </Box>
                <TrendingIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Completed Today
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="success.main">
                    {stats.completedToday}
                  </Typography>
                </Box>
                <CompletedIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Overdue
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="error.main">
                    {stats.overdue}
                  </Typography>
                </Box>
                <OverdueIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Upcoming
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="warning.main">
                    {stats.upcoming}
                  </Typography>
                </Box>
                <UpcomingIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pomodoro Timer */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pomodoro Timer
              </Typography>
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h2" fontWeight={700} color="primary">
                  {formatTime(pomodoroTime)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {pomodoroMode === 'work' ? 'Focus Time' : 'Break Time'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <IconButton
                    color="primary"
                    size="large"
                    onClick={handlePomodoroToggle}
                  >
                    {pomodoroRunning ? <PauseIcon fontSize="large" /> : <PlayIcon fontSize="large" />}
                  </IconButton>
                  <IconButton
                    color="secondary"
                    size="large"
                    onClick={handlePomodoroReset}
                  >
                    <RefreshIcon fontSize="large" />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Habits Progress */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Today's Habits
                </Typography>
                <Button size="small" onClick={() => navigate('/habits')}>
                  View All
                </Button>
              </Box>
              
              {todayHabits.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No habits tracked yet
                </Typography>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        Progress
                      </Typography>
                      <Typography variant="body2">
                        {completedHabitsToday.length} / {todayHabits.length}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(completedHabitsToday.length / todayHabits.length) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {todayHabits.slice(0, 5).map((habit) => {
                      const isCompleted = completedHabitsToday.includes(habit);
                      return (
                        <Box
                          key={habit._id}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <Typography variant="body2">{habit.name}</Typography>
                          <Chip
                            label={isCompleted ? 'Done' : 'Pending'}
                            size="small"
                            color={isCompleted ? 'success' : 'default'}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" onClick={() => navigate('/tasks')}>
                  View All Tasks
                </Button>
                <Button variant="outlined" onClick={() => navigate('/calendar')}>
                  Open Calendar
                </Button>
                <Button variant="outlined" onClick={() => navigate('/settings')}>
                  Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

