import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId} (Role: ${socket.userRole})`);

    // Join role-specific room
    socket.join(socket.userRole);
    
    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
    });

    // SOS Alert - Broadcast to faculty and admin
    socket.on('sos:alert', (data) => {
      io.to('faculty').to('admin').emit('sos:new-alert', data);
    });

    // Emergency Assist - Notify staff
    socket.on('emergency:request', (data) => {
      io.to('staff').to('admin').emit('emergency:new-request', data);
    });

    // Counseling Request - Notify counselors
    socket.on('counseling:request', (data) => {
      io.to('counselor').to('admin').emit('counseling:new-request', data);
    });

    // Direct Messages
    socket.on('message:send', (data) => {
      io.to(`user:${data.recipientId}`).emit('message:new', data);
    });

    // Typing indicators
    socket.on('typing:start', (data) => {
      io.to(`user:${data.recipientId}`).emit('typing:start', {
        userId: socket.userId
      });
    });

    socket.on('typing:stop', (data) => {
      io.to(`user:${data.recipientId}`).emit('typing:stop', {
        userId: socket.userId
      });
    });

    // Study Pod chat
    socket.on('pod:join', (podId) => {
      socket.join(`pod:${podId}`);
      console.log(`User ${socket.userId} joined pod ${podId}`);
    });

    socket.on('pod:leave', (podId) => {
      socket.leave(`pod:${podId}`);
    });

    socket.on('pod:message', (data) => {
      io.to(`pod:${data.podId}`).emit('pod:new-message', data);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
};

// Export function to get io instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};
