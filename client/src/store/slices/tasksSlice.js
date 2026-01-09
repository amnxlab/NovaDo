import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/tasks?${params}`);
      return response.data.tasks;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch tasks');
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData, { rejectWithValue }) => {
    try {
      const response = await api.post('/tasks', taskData);
      return response.data.task;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create task');
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/tasks/${id}`, updates);
      return response.data.task;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update task');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/tasks/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete task');
    }
  }
);

export const bulkUpdateTasks = createAsyncThunk(
  'tasks/bulkUpdate',
  async (updates, { rejectWithValue }) => {
    try {
      await api.patch('/tasks/bulk-update', { updates });
      return updates;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update tasks');
    }
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    items: [],
    selectedTask: null,
    loading: false,
    error: null,
    filters: {
      list: null,
      status: 'active',
      priority: null,
      tag: null,
      search: ''
    }
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        list: null,
        status: 'active',
        priority: null,
        tag: null,
        search: ''
      };
    },
    setSelectedTask: (state, action) => {
      state.selectedTask = action.payload;
    },
    taskCreatedViaSocket: (state, action) => {
      state.items.push(action.payload);
    },
    taskUpdatedViaSocket: (state, action) => {
      const index = state.items.findIndex(t => t._id === action.payload._id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    taskDeletedViaSocket: (state, action) => {
      state.items = state.items.filter(t => t._id !== action.payload.id);
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch tasks
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create task
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      // Update task
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.items.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete task
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter(t => t._id !== action.payload);
      })
      // Bulk update
      .addCase(bulkUpdateTasks.fulfilled, (state, action) => {
        action.payload.forEach(update => {
          const task = state.items.find(t => t._id === update.id);
          if (task) {
            Object.assign(task, update);
          }
        });
      });
  }
});

export const {
  setFilters,
  clearFilters,
  setSelectedTask,
  taskCreatedViaSocket,
  taskUpdatedViaSocket,
  taskDeletedViaSocket
} = tasksSlice.actions;

export default tasksSlice.reducer;

