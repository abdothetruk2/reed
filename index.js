import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

dotenv.config();

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// MongoDB client and db
let client;
let db;

const connectToMongo = async () => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('chat_app');
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

// Create uploads folder if it doesn’t exist
const uploadDir = path.join(__dirname, 'dist/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/uploads', express.static(path.join(__dirname, 'dist/uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbStatus: db ? 'connected' : 'disconnected' });
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// Get messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await db.collection('messages').aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $sort: { createdAt: 1 } },
      {
        $project: {
          content: 1,
          createdAt: 1,
          imageUrl: 1,
          'user.username': 1
        }
      }
    ]).toArray();

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.collection('users').find().sort({ lastSeen: -1 }).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const imageUrl = `/uploads/${req.file.filename}`;
    fs.renameSync(req.file.path, path.join(uploadDir, req.file.filename));
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to DB then start Socket.io
connectToMongo().then(() => {
  io.on('connection', async (socket) => {
    console.log('🔌 User connected:', socket.id);

    socket.on('join', async (username) => {
      try {
        let user = await db.collection('users').findOne({ username });

        if (!user) {
          const result = await db.collection('users').insertOne({ username, lastSeen: new Date() });
          user = { _id: result.insertedId, username, lastSeen: new Date() };
        }

        socket.username = user.username;
        socket.userId = user._id;

        io.emit('user_joined', user);
      } catch (error) {
        socket.emit('error', error.message);
      }
    });

    socket.on('chat_message', async ({ content, imageUrl }) => {
      try {
        const message = {
          content,
          userId: socket.userId,
          createdAt: new Date(),
          imageUrl: imageUrl || null
        };

        const result = await db.collection('messages').insertOne(message);
        const insertedMessage = {
          ...message,
          _id: result.insertedId,
          user: { username: socket.username }
        };

        io.emit('new_message', insertedMessage);
      } catch (error) {
        socket.emit('error', error.message);
      }
    });

    socket.on('disconnect', async () => {
      if (socket.userId) {
        try {
          await db.collection('users').updateOne(
            { _id: socket.userId },
            { $set: { lastSeen: new Date() } }
          );
          io.emit('user_left', { userId: socket.userId });
        } catch (error) {
          console.error('Error updating lastSeen:', error);
        }
      }
      console.log('❌ User disconnected:', socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) await client.close();
  process.exit();
});
