import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import http from 'http';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { initializeSocket } from './socket';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import roomsRoutes from './modules/rooms/rooms.routes';
import { messageDirectRoutes } from './modules/messages/messages.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();

// Security & CORS middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.', statusCode: 429 },
});
app.use('/api', apiLimiter);

// Serve uploaded files statically
const uploadsPath = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/messages', messageDirectRoutes);
app.use('/api/admin', adminRoutes);

// Serve built frontend in production
if (config.nodeEnv === 'production') {
  const clientDistCandidates = [
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
  ];

  const clientDistPath = clientDistCandidates.find((candidate) =>
    fs.existsSync(path.join(candidate, 'index.html'))
  );

  if (clientDistPath) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (
        req.path === '/api' ||
        req.path.startsWith('/api/') ||
        req.path === '/uploads' ||
        req.path.startsWith('/uploads/') ||
        req.path === '/socket.io' ||
        req.path.startsWith('/socket.io/')
      ) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }
}

// Global error handler
app.use(errorHandler);

// Create HTTP server & attach Socket.IO
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: config.corsOrigin,
    credentials: true,
  },
});

initializeSocket(io);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

export { app, server, io };
