import React from 'react';
import { useDispatch } from 'react-redux';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Typography,
  IconButton,
  Chip,
  Stack
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  CalendarToday as CalendarIcon,
  Flag as FlagIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { format, isToday, isPast } from 'date-fns';
import { updateTask, deleteTask } from '../store/slices/tasksSlice';
import { setSelectedTask, setTaskDetailOpen } from '../store/slices/uiSlice';

const priorityColors = {
  high: '#ff4d4f',
  medium: '#faad14',
  low: '#1890ff',
  none: '#d9d9d9'
};

const TaskItem = ({ task }) => {
  const dispatch = useDispatch();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const handleToggleComplete = async (e) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'active' : 'completed';
    dispatch(updateTask({ id: task._id, updates: { status: newStatus } }));
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this task?')) {
      dispatch(deleteTask(task._id));
    }
  };

  const handleClick = () => {
    dispatch(setSelectedTask(task));
    dispatch(setTaskDetailOpen(true));
  };

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status === 'active';
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 3
        },
        opacity: task.status === 'completed' ? 0.6 : 1
      }}
      onClick={handleClick}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
          <DragIcon sx={{ color: 'text.secondary' }} />
        </Box>

        <Checkbox
          checked={task.status === 'completed'}
          onChange={handleToggleComplete}
          onClick={(e) => e.stopPropagation()}
        />

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            variant="body1"
            sx={{
              textDecoration: task.status === 'completed' ? 'line-through' : 'none',
              fontWeight: 500
            }}
          >
            {task.title}
          </Typography>

          {task.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {task.description}
            </Typography>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {task.dueDate && (
              <Chip
                icon={<CalendarIcon />}
                label={format(new Date(task.dueDate), 'MMM dd')}
                size="small"
                color={isOverdue ? 'error' : isDueToday ? 'warning' : 'default'}
                variant="outlined"
              />
            )}

            {task.priority !== 'none' && (
              <Chip
                icon={<FlagIcon />}
                label={task.priority}
                size="small"
                sx={{
                  borderColor: priorityColors[task.priority],
                  color: priorityColors[task.priority]
                }}
                variant="outlined"
              />
            )}

            {task.tags && task.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}

            {task.subtasks && task.subtasks.length > 0 && (
              <Chip
                label={`${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length}`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>

        <IconButton
          size="small"
          onClick={handleDelete}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon />
        </IconButton>
      </CardContent>
    </Card>
  );
};

export default TaskItem;

