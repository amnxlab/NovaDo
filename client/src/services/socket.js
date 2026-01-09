import { io } from 'socket.io-client';
import store from '../store';
import {
  taskCreatedViaSocket,
  taskUpdatedViaSocket,
  taskDeletedViaSocket
} from '../store/slices/tasksSlice';
import {
  listCreatedViaSocket,
  listUpdatedViaSocket,
  listDeletedViaSocket
} from '../store/slices/listsSlice';

let socket = null;

export const initializeSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  // Task events
  socket.on('task:created', (task) => {
    store.dispatch(taskCreatedViaSocket(task));
  });

  socket.on('task:updated', (task) => {
    store.dispatch(taskUpdatedViaSocket(task));
  });

  socket.on('task:deleted', (data) => {
    store.dispatch(taskDeletedViaSocket(data));
  });

  // List events
  socket.on('list:created', (list) => {
    store.dispatch(listCreatedViaSocket(list));
  });

  socket.on('list:updated', (list) => {
    store.dispatch(listUpdatedViaSocket(list));
  });

  socket.on('list:deleted', (data) => {
    store.dispatch(listDeletedViaSocket(data));
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

