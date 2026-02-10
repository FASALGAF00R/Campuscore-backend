import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Import configurations
import connectDB from './config/database.js';
import { initializeSocket } from './config/socket.js';

// Import middleware
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.js';
import sosRoutes from './routes/sos.js';
import emergencyAssistRoutes from './routes/emergencyAssist.js';
import eventRoutes from './routes/events.js';
import notificationRoutes from './routes/notifications.js';
import studyPodRoutes from './routes/studyPods.js';
import counselingRoutes from './routes/counseling.js';
import timetableRoutes from './routes/timetables.js';
import studyMaterialRoutes from './routes/studyMaterials.js';

// Initialize dotenv
dotenv.config();

// ES modules workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Create HTTP server
const server = createServer(app);

// Connect to MongoDB
connectDB();

// Initialize Socket.IO
const io = initializeSocket(server);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// API Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎓 Campus Core Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      events: '/api/events',
      sos: '/api/sos',
      emergencyAssist: '/api/emergency-assist',
      counseling: '/api/counseling',
      studyPods: '/api/study-pods',
      materials: '/api/study-materials',
      timetables: '/api/timetables',
      notifications: '/api/notifications'
    }
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/emergency-assist', emergencyAssistRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/study-pods', studyPodRoutes);
app.use('/api/counseling', counselingRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/study-materials', studyMaterialRoutes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`🌍 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`📡 Socket.IO ready for real-time communication\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});
