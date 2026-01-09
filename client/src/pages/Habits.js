import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  LocalFireDepartment as StreakIcon
} from '@mui/icons-material';
import { fetchHabits, createHabit, completeHabit, deleteHabit } from '../store/slices/habitsSlice';
import { toast } from 'react-toastify';

const Habits = () => {
  const dispatch = useDispatch();
  const { items: habits, loading } = useSelector((state) => state.habits);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitFrequency, setNewHabitFrequency] = useState('daily');

  useEffect(() => {
    dispatch(fetchHabits());
  }, [dispatch]);

  const handleCreateHabit = async () => {
    if (!newHabitName.trim()) return;

    const result = await dispatch(createHabit({
      name: newHabitName,
      frequency: newHabitFrequency
    }));

    if (createHabit.fulfilled.match(result)) {
      toast.success('Habit created successfully!');
      setNewHabitName('');
      setCreateDialogOpen(false);
    }
  };

  const handleCompleteHabit = async (habitId) => {
    const result = await dispatch(completeHabit({
      id: habitId,
      date: new Date().toISOString()
    }));

    if (completeHabit.fulfilled.match(result)) {
      toast.success('Habit completed! 🎉');
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      const result = await dispatch(deleteHabit(habitId));
      if (deleteHabit.fulfilled.match(result)) {
        toast.success('Habit deleted');
      }
    }
  };

  const isCompletedToday = (habit) => {
    const today = new Date().toISOString().split('T')[0];
    return habit.completions.some(c => c.date.startsWith(today));
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Habits
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Build better habits, one day at a time
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Habit
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading habits...</Typography>
      ) : habits.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No habits yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start tracking your daily habits
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Habit
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {habits.map((habit) => {
            const completed = isCompletedToday(habit);
            const completionRate = habit.completions.length > 0
              ? Math.round((habit.currentStreak / habit.completions.length) * 100)
              : 0;

            return (
              <Grid item xs={12} sm={6} md={4} key={habit._id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {habit.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteHabit(habit._id)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={habit.frequency}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      {completed && (
                        <Chip
                          label="Completed Today"
                          size="small"
                          color="success"
                        />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <StreakIcon color="warning" />
                      <Typography variant="body2">
                        <strong>{habit.currentStreak}</strong> day streak
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (Best: {habit.longestStreak})
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Completion Rate
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={completionRate}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>

                    <Button
                      fullWidth
                      variant={completed ? 'outlined' : 'contained'}
                      color={completed ? 'success' : 'primary'}
                      startIcon={<CheckIcon />}
                      onClick={() => !completed && handleCompleteHabit(habit._id)}
                      disabled={completed}
                    >
                      {completed ? 'Completed' : 'Mark Complete'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create Habit Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Habit</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Habit Name"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              autoFocus
            />
            <TextField
              fullWidth
              select
              label="Frequency"
              value={newHabitFrequency}
              onChange={(e) => setNewHabitFrequency(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateHabit}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Habits;

