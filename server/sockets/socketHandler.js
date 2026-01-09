const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = (io) => {
  // Authentication middleware for socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Join user's personal room
    socket.join(`user:${socket.userId}`);
    
    // Handle task updates
    socket.on('task:update', (data) => {
      socket.to(`user:${socket.userId}`).emit('task:updated', data);
    });
    
    // Handle list updates
    socket.on('list:update', (data) => {
      socket.to(`user:${socket.userId}`).emit('list:updated', data);
    });
    
    // Handle habit updates
    socket.on('habit:update', (data) => {
      socket.to(`user:${socket.userId}`).emit('habit:updated', data);
    });
    
    // Typing indicator for smart input
    socket.on('smart-input:typing', () => {
      socket.to(`user:${socket.userId}`).emit('smart-input:typing');
    });
    
    socket.on('smart-input:stop-typing', () => {
      socket.to(`user:${socket.userId}`).emit('smart-input:stop-typing');
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};

