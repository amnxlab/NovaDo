import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: localStorage.getItem('theme') || 'light',
    sidebarOpen: true,
    taskDetailOpen: false,
    smartInputOpen: false,
    pomodoroRunning: false,
    pomodoroTime: 25 * 60, // seconds
    pomodoroMode: 'work' // 'work', 'shortBreak', 'longBreak'
  },
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setTaskDetailOpen: (state, action) => {
      state.taskDetailOpen = action.payload;
    },
    setSmartInputOpen: (state, action) => {
      state.smartInputOpen = action.payload;
    },
    setPomodoroRunning: (state, action) => {
      state.pomodoroRunning = action.payload;
    },
    setPomodoroTime: (state, action) => {
      state.pomodoroTime = action.payload;
    },
    setPomodoroMode: (state, action) => {
      state.pomodoroMode = action.payload;
    },
    decrementPomodoroTime: (state) => {
      if (state.pomodoroTime > 0) {
        state.pomodoroTime -= 1;
      }
    }
  }
});

export const {
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  setTaskDetailOpen,
  setSmartInputOpen,
  setPomodoroRunning,
  setPomodoroTime,
  setPomodoroMode,
  decrementPomodoroTime
} = uiSlice.actions;

export default uiSlice.reducer;

