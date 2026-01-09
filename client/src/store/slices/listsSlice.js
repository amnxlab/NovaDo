import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchLists = createAsyncThunk(
  'lists/fetchLists',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/lists');
      return response.data.lists;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch lists');
    }
  }
);

export const createList = createAsyncThunk(
  'lists/createList',
  async (listData, { rejectWithValue }) => {
    try {
      const response = await api.post('/lists', listData);
      return response.data.list;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create list');
    }
  }
);

export const updateList = createAsyncThunk(
  'lists/updateList',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/lists/${id}`, updates);
      return response.data.list;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update list');
    }
  }
);

export const deleteList = createAsyncThunk(
  'lists/deleteList',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/lists/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete list');
    }
  }
);

const listsSlice = createSlice({
  name: 'lists',
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {
    listCreatedViaSocket: (state, action) => {
      state.items.push(action.payload);
    },
    listUpdatedViaSocket: (state, action) => {
      const index = state.items.findIndex(l => l._id === action.payload._id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    listDeletedViaSocket: (state, action) => {
      state.items = state.items.filter(l => l._id !== action.payload.id);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLists.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchLists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createList.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateList.fulfilled, (state, action) => {
        const index = state.items.findIndex(l => l._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteList.fulfilled, (state, action) => {
        state.items = state.items.filter(l => l._id !== action.payload);
      });
  }
});

export const { listCreatedViaSocket, listUpdatedViaSocket, listDeletedViaSocket } = listsSlice.actions;
export default listsSlice.reducer;

