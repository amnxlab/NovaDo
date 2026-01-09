import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchHabits = createAsyncThunk(
  'habits/fetchHabits',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/habits');
      return response.data.habits;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch habits');
    }
  }
);

export const createHabit = createAsyncThunk(
  'habits/createHabit',
  async (habitData, { rejectWithValue }) => {
    try {
      const response = await api.post('/habits', habitData);
      return response.data.habit;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create habit');
    }
  }
);

export const updateHabit = createAsyncThunk(
  'habits/updateHabit',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/habits/${id}`, updates);
      return response.data.habit;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update habit');
    }
  }
);

export const deleteHabit = createAsyncThunk(
  'habits/deleteHabit',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/habits/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete habit');
    }
  }
);

export const completeHabit = createAsyncThunk(
  'habits/completeHabit',
  async ({ id, date, count, note }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/habits/${id}/complete`, { date, count, note });
      return response.data.habit;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to complete habit');
    }
  }
);

const habitsSlice = createSlice({
  name: 'habits',
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHabits.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHabits.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchHabits.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createHabit.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateHabit.fulfilled, (state, action) => {
        const index = state.items.findIndex(h => h._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteHabit.fulfilled, (state, action) => {
        state.items = state.items.filter(h => h._id !== action.payload);
      })
      .addCase(completeHabit.fulfilled, (state, action) => {
        const index = state.items.findIndex(h => h._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });
  }
});

export default habitsSlice.reducer;

