import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  IconButton,
  Typography,
  Divider,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { setTaskDetailOpen, setSelectedTask } from '../store/slices/uiSlice';
import { updateTask } from '../store/slices/tasksSlice';
import { format } from 'date-fns';

const TaskDetailDialog = () => {
  const dispatch = useDispatch();
  const { taskDetailOpen, selectedTask } = useSelector((state) => state.ui);
  const { items: lists } = useSelector((state) => state.lists);

  if (!selectedTask) return null;

  const handleClose = () => {
    dispatch(setTaskDetailOpen(false));
    dispatch(setSelectedTask(null));
  };

  const handleUpdate = (field, value) => {
    dispatch(updateTask({ id: selectedTask._id, updates: { [field]: value } }));
  };

  const handleSubtaskToggle = (index) => {
    const updatedSubtasks = [...selectedTask.subtasks];
    updatedSubtasks[index].completed = !updatedSubtasks[index].completed;
    handleUpdate('subtasks', updatedSubtasks);
  };

  return (
    <Dialog open={taskDetailOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Task Details</Typography>
        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            label="Title"
            value={selectedTask.title}
            onChange={(e) => handleUpdate('title', e.target.value)}
            variant="outlined"
          />

          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            value={selectedTask.description || ''}
            onChange={(e) => handleUpdate('description', e.target.value)}
            variant="outlined"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={selectedTask.dueDate ? format(new Date(selectedTask.dueDate), 'yyyy-MM-dd') : ''}
              onChange={(e) => handleUpdate('dueDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Due Time"
              type="time"
              value={selectedTask.dueTime || ''}
              onChange={(e) => handleUpdate('dueTime', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={selectedTask.priority}
              onChange={(e) => handleUpdate('priority', e.target.value)}
              label="Priority"
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>List</InputLabel>
            <Select
              value={selectedTask.list._id || selectedTask.list}
              onChange={(e) => handleUpdate('list', e.target.value)}
              label="List"
            >
              {lists.filter(l => !l.isSmart).map((list) => (
                <MenuItem key={list._id} value={list._id}>
                  {list.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
            <>
              <Divider />
              <Typography variant="subtitle1" fontWeight={600}>
                Subtasks
              </Typography>
              <List>
                {selectedTask.subtasks.map((subtask, index) => (
                  <ListItem key={index} dense>
                    <ListItemIcon>
                      <Checkbox
                        checked={subtask.completed}
                        onChange={() => handleSubtaskToggle(index)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={subtask.title}
                      sx={{
                        textDecoration: subtask.completed ? 'line-through' : 'none'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {selectedTask.createdByAI && (
            <Typography variant="caption" color="primary">
              ✨ Created by AI
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          variant="contained"
          color={selectedTask.status === 'completed' ? 'warning' : 'success'}
          onClick={() => handleUpdate('status', selectedTask.status === 'completed' ? 'active' : 'completed')}
        >
          {selectedTask.status === 'completed' ? 'Mark Active' : 'Mark Complete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskDetailDialog;

