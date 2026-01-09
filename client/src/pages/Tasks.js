import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { fetchTasks, setFilters } from '../store/slices/tasksSlice';
import TaskList from '../components/TaskList';
import CreateTaskDialog from '../components/CreateTaskDialog';
import TaskDetailDialog from '../components/TaskDetailDialog';

const Tasks = () => {
  const { listId } = useParams();
  const dispatch = useDispatch();
  const { items: tasks, filters, loading } = useSelector((state) => state.tasks);
  const { items: lists } = useSelector((state) => state.lists);
  
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [sortAnchor, setSortAnchor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentList = lists.find((l) => l._id === listId);

  useEffect(() => {
    const newFilters = { ...filters };
    if (listId) {
      newFilters.list = listId;
    } else {
      delete newFilters.list;
    }
    dispatch(setFilters(newFilters));
    dispatch(fetchTasks(newFilters));
  }, [listId, dispatch]);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    dispatch(setFilters({ ...filters, search: query }));
    dispatch(fetchTasks({ ...filters, search: query }));
  };

  const handleFilterByPriority = (priority) => {
    const newFilters = { ...filters, priority: priority === filters.priority ? null : priority };
    dispatch(setFilters(newFilters));
    dispatch(fetchTasks(newFilters));
    setFilterAnchor(null);
  };

  const handleFilterByStatus = (status) => {
    const newFilters = { ...filters, status };
    dispatch(setFilters(newFilters));
    dispatch(fetchTasks(newFilters));
    setFilterAnchor(null);
  };

  const activeTasks = tasks.filter((t) => t.status === 'active');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            {currentList ? currentList.name : 'All Tasks'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {activeTasks.length} active, {completedTasks.length} completed
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateTaskOpen(true)}
        >
          New Task
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={handleSearch}
          size="small"
          sx={{ flexGrow: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />

        <IconButton onClick={(e) => setFilterAnchor(e.currentTarget)}>
          <FilterIcon />
        </IconButton>

        <IconButton onClick={(e) => setSortAnchor(e.currentTarget)}>
          <SortIcon />
        </IconButton>

        {filters.priority && (
          <Chip
            label={`Priority: ${filters.priority}`}
            onDelete={() => handleFilterByPriority(null)}
            color="primary"
          />
        )}
      </Box>

      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={() => setFilterAnchor(null)}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2">Priority</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleFilterByPriority('high')}>High</MenuItem>
        <MenuItem onClick={() => handleFilterByPriority('medium')}>Medium</MenuItem>
        <MenuItem onClick={() => handleFilterByPriority('low')}>Low</MenuItem>
        <MenuItem onClick={() => handleFilterByPriority('none')}>None</MenuItem>
      </Menu>

      <Menu
        anchorEl={sortAnchor}
        open={Boolean(sortAnchor)}
        onClose={() => setSortAnchor(null)}
      >
        <MenuItem onClick={() => setSortAnchor(null)}>Due Date</MenuItem>
        <MenuItem onClick={() => setSortAnchor(null)}>Priority</MenuItem>
        <MenuItem onClick={() => setSortAnchor(null)}>Created Date</MenuItem>
        <MenuItem onClick={() => setSortAnchor(null)}>Alphabetical</MenuItem>
      </Menu>

      {loading ? (
        <Typography>Loading tasks...</Typography>
      ) : (
        <>
          {activeTasks.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Active Tasks
              </Typography>
              <TaskList tasks={activeTasks} />
            </Box>
          )}

          {completedTasks.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Completed Tasks
              </Typography>
              <TaskList tasks={completedTasks} />
            </Box>
          )}

          {tasks.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                No tasks yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Create your first task to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateTaskOpen(true)}
              >
                Create Task
              </Button>
            </Box>
          )}
        </>
      )}

      <CreateTaskDialog
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        defaultListId={listId}
      />

      <TaskDetailDialog />
    </Box>
  );
};

export default Tasks;

