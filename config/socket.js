import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import DeptMessage from '../models/DeptMessage.js';
import GroupMessage from '../models/GroupMessage.js';
import GroupChat from '../models/GroupChat.js';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ── Authentication middleware ──────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication token missing'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;

      const user = await User.findById(decoded.id)
        .select('department firstName lastName avatar')
        .lean();

      if (user) {
        socket.userDepartment = (user.department || '').trim();
        socket.userName = `${user.firstName} ${user.lastName}`;
        socket.userAvatar = user.avatar || null;
      }

      next();
    } catch (err) {
      console.error('[socket] Auth error:', err.message);
      next(new Error('Invalid authentication token'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(
      `[socket] connected: ${socket.userId} | role: ${socket.userRole} | dept: ${socket.userDepartment}`
    );

    // Join role room (faculty / student / admin …)
    socket.join(socket.userRole);

    // Join personal room (for targeted notifications)
    socket.join(`user:${socket.userId}`);

    // Auto-join departmental chat room on connect
    if (socket.userDepartment) {
      const deptRoom = `dept-chat:${socket.userDepartment.toLowerCase()}`;
      socket.join(deptRoom);
      socket.deptRoom = deptRoom;
      console.log(`[socket] ${socket.userId} joined room: ${deptRoom} (Role: ${socket.userRole})`);
    }

    // ── FACULTY DEPARTMENT CHAT ──────────────────────────────────────────────

    /**
     * Event: faculty:dept-message
     * Payload: { content: string, department?: string }
     *
     * Saves the message to DB and broadcasts to everyone in the dept room.
     */
    socket.on('faculty:dept-message', async ({ content, department }) => {
      // Both faculty and students can send to their own dept

      const dept = (department || socket.userDepartment || '').trim();
      if (!dept || !content || !content.trim()) return;

      try {
        // Persist to MongoDB
        const saved = await DeptMessage.create({
          department: dept,
          sender: socket.userId,
          content: content.trim(),
        });

        // Build the payload with sender info (avoids a populate round-trip)
        const payload = {
          _id: saved._id.toString(),
          department: saved.department,
          content: saved.content,
          createdAt: saved.createdAt,
          sender: {
            _id: socket.userId,
            firstName: socket.userName.split(' ')[0],
            lastName: socket.userName.split(' ').slice(1).join(' '),
            avatar: socket.userAvatar,
            department: socket.userDepartment,
          },
        };

        // Broadcast to the department room (including sender)
        const room = `dept-chat:${dept.toLowerCase()}`;
        io.to(room).emit('faculty:dept-message', payload);

        console.log(
          `[socket] dept-chat[${dept}] message from ${socket.userId}: ${content.slice(0, 60)}`
        );
      } catch (err) {
        console.error('[socket] Failed to save dept message:', err);
        socket.emit('faculty:error', { message: 'Failed to send message. Please try again.' });
      }
    });

    /**
     * Event: faculty:join-dept
     * Payload: department name (string)
     *
     * Allows a faculty member to join additional department rooms (e.g. HoD).
     */
    socket.on('faculty:join-dept', (deptName) => {
      if (socket.userRole === 'faculty' && deptName) {
        const room = `dept-chat:${deptName.toLowerCase().trim()}`;
        socket.join(room);
        console.log(`[socket] ${socket.userId} joined extra room: ${room}`);
      }
    });

    /**
     * Typing indicators
     * Payload: { department: string }
     */
    socket.on('faculty:typing-start', ({ department }) => {
      if (socket.userRole !== 'faculty') return;
      const dept = (department || socket.userDepartment || '').trim();
      const room = `dept-chat:${dept.toLowerCase()}`;
      socket.to(room).emit('faculty:typing', {
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    socket.on('faculty:typing-stop', ({ department }) => {
      if (socket.userRole !== 'faculty') return;
      const dept = (department || socket.userDepartment || '').trim();
      const room = `dept-chat:${dept.toLowerCase()}`;
      socket.to(room).emit('faculty:typing-stop', { userId: socket.userId });
    });

    // ── CUSTOM GROUP CHAT ────────────────────────────────────────────────────

    /**
     * Event: faculty:join-group
     * Payload: { groupId: string }
     */
    socket.on('faculty:join-group', ({ groupId }) => {
      if (groupId) {
        socket.join(`group:${groupId}`);
        console.log(`[socket] ${socket.userId} joined group: ${groupId}`);
      }
    });

    /**
     * Event: faculty:group-message
     * Payload: { groupId: string, content: string }
     */
    socket.on('faculty:group-message', async ({ groupId, content }) => {
      if (!groupId || !content || !content.trim()) return;

      try {
        // Verify membership (optional but good for security)
        const group = await GroupChat.findOne({ _id: groupId, members: socket.userId });
        if (!group) return;

        const saved = await GroupMessage.create({
          group: groupId,
          sender: socket.userId,
          content: content.trim(),
        });

        // Update last message in GroupChat
        await GroupChat.findByIdAndUpdate(groupId, {
          lastMessage: {
            content: saved.content,
            sender: socket.userId,
            sentAt: saved.createdAt,
          },
        });

        const payload = {
          _id: saved._id.toString(),
          group: groupId,
          content: saved.content,
          createdAt: saved.createdAt,
          sender: {
            _id: socket.userId,
            firstName: socket.userName.split(' ')[0],
            lastName: socket.userName.split(' ').slice(1).join(' '),
            avatar: socket.userAvatar,
            role: socket.userRole,
          },
        };

        io.to(`group:${groupId}`).emit('faculty:group-message', payload);
      } catch (err) {
        console.error('[socket] Failed to save group message:', err);
      }
    });

    socket.on('faculty:group-typing-start', ({ groupId }) => {
      if (!groupId) return;
      socket.to(`group:${groupId}`).emit('faculty:group-typing', {
        groupId,
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    socket.on('faculty:group-typing-stop', ({ groupId }) => {
      if (!groupId) return;
      socket.to(`group:${groupId}`).emit('faculty:group-typing-stop', {
        groupId,
        userId: socket.userId,
      });
    });

    // ── OTHER SYSTEM EVENTS ──────────────────────────────────────────────────

    // SOS Alert → notify faculty + admin
    socket.on('sos:alert', (data) => {
      io.to('faculty').to('admin').emit('sos:new-alert', data);
    });

    // Emergency Assist → notify staff + admin
    socket.on('emergency:request', (data) => {
      io.to('staff').to('admin').emit('emergency:new-request', data);
    });

    // Counseling Request → notify counselors + admin
    socket.on('counseling:request', (data) => {
      io.to('counselor').to('admin').emit('counseling:new-request', data);
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.userId}`);
    });
  });

  console.log('[socket] Socket.IO initialized');
  return io;
};

// Export io instance getter
export const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};
