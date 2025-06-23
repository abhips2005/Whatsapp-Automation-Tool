import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Redis from 'ioredis'; 
import Queue from 'bull';    

// Import modular routes
import contactsRoutes from './routes/contacts';
import whatsappRoutes from './routes/whatsapp';
import googleSheetsRoutes from './routes/googleSheets';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Redis connection for job queue with error handling
let redis: Redis | null = null;
let broadcastQueue: Queue.Queue | null = null;
let certificateQueue: Queue.Queue | null = null;

// Initialize Redis connection
async function initializeRedis() {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailedConnection: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    // Add error handler to suppress unhandled error events
    redis.on('error', (error) => {
      // Silently handle Redis connection errors
      console.log('Redis connection issue (continuing without Redis)');
    });

    // Test Redis connection
    await redis.ping();
    
    // Job Queues - only create if Redis is available
    broadcastQueue = new Queue('broadcast jobs', { redis });
    certificateQueue = new Queue('certificate jobs', { redis });
    
    console.log('✅ Redis connected - Job queues enabled');
  } catch (error) {
    console.warn('⚠️ Redis not available - Job queues disabled. Broadcasting will run synchronously.');
    console.warn('To enable job queues, start Redis server: redis-server');
    
    // Clean up Redis instance to prevent further errors
    if (redis) {
      redis.disconnect();
      redis = null;
    }
    broadcastQueue = null;
    certificateQueue = null;
  }
}

// Socket.io connection handling with connection tracking
let activeConnections = 0;

io.on('connection', (socket) => {
  activeConnections++;
  
  // Only log every 10th connection to reduce spam
  if (activeConnections % 10 === 1) {
    console.log(`📱 WebSocket clients: ${activeConnections} active connections`);
  }
  
  socket.on('disconnect', (reason) => {
    activeConnections--;
    
    // Log disconnections with reasons if they seem problematic
    if (reason !== 'client namespace disconnect' && activeConnections % 10 === 0) {
      console.log(`📱 Client disconnected (${reason}). Active: ${activeConnections}`);
    }
  });

  // Join campaign room for real-time updates
  socket.on('join-campaign', (campaignId: string) => {
    socket.join(`campaign-${campaignId}`);
  });
  
  // Handle connection errors
  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// In-memory storage for campaigns and data
let campaigns: Map<string, any> = new Map();
let currentData: any[] = [];

// ONLY keep modular routes - remove all direct route definitions
app.use('/api/contacts', contactsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/google-sheets', googleSheetsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      api: 'running',
      websocket: 'running',
      whatsapp: 'available',
      googleSheets: 'available'
    }
  });
});

const PORT = process.env.PORT || 5000;

// Initialize WhatsApp client
async function initializeWhatsApp() {
  try {
    console.log('📱 Initializing WhatsApp client...');
    // Import and start WhatsApp client
    const { client } = await import('../source/client');
    client.initialize();
    console.log('📱 WhatsApp client initialization started');
    console.log('📱 QR Code will be available at: http://localhost:5000/api/whatsapp/qr');
  } catch (error) {
    console.error('❌ Failed to initialize WhatsApp client:', error);
  }
}

server.listen(PORT, async () => {
  console.log(`🚀 Server is running!
📍 Port: ${PORT}
🌐 API: http://localhost:${PORT}/api
🔗 WebSocket: ws://localhost:${PORT}
💻 Frontend: http://localhost:3001

📁 Available Endpoints:
   GET  /api/health
   GET  /api/contacts
   POST /api/contacts/analyze-csv
   POST /api/contacts/process-csv
   POST /api/google-sheets/import    ← This should work now
   POST /api/google-sheets/test      ← This should work now
   GET  /api/whatsapp/status
   GET  /api/whatsapp/qr
   POST /api/whatsapp/logout
   POST /api/whatsapp/broadcast
   GET  /api/whatsapp/campaigns
`);
  
  // Initialize Redis connection
  await initializeRedis();
  
  // Initialize WhatsApp client
  await initializeWhatsApp();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📪 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📪 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});