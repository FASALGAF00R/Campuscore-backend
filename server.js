// entry file
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import connectDB from './config/database.js';
import { initializeSocket } from './config/socket.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.js';
import sosRoutes from './routes/sos.js';
import notificationRoutes from './routes/notifications.js';
import eventRoutes from './routes/events.js';
import emergencyAssistRoutes from './routes/emergencyAssist.js';
import counselingRoutes from './routes/counseling.js';
import studyPodRoutes from './routes/studyPods.js';
import timetableRoutes from './routes/timetables.js';
import studyMaterialRoutes from './routes/studyMaterials.js';
import adminRoutes from './routes/admin.js';

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Campus Core Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/emergency-assist', emergencyAssistRoutes);
app.use('/api/counseling', counselingRoutes);
app.use('/api/study-pods', studyPodRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/study-materials', studyMaterialRoutes);
app.use('/api/admin', adminRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 CORS enabled for: ${corsOptions.origin}`);

  // Initialize Socket.IO
  initializeSocket(httpServer);
});
