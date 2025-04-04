import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { io } from 'socket.io-client';

dotenv.config();

const app = express();

app.use(express.static('dist'));
const httpServer = createServer(app);
const ioServer = new Server(httpServer, {
  cors: {
    origin: "https://localhost2.netlify.app",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

app.use(cors({
  origin: "https://localhost2.netlify.app",
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

// Heartbeat endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/dist/index.html"));
});

// Get all messages
app.get('/api/messages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, chat_users(username)')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_users')
      .select('*')
      .order('last_seen', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO connection handling
ioServer.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle joining chat
  socket.on('join', async (username) => {
    try {
      // Try to upsert the user with the given username
      const { data, error } = await supabase
        .from('chat_users')
        .upsert({ 
          username,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'username',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        // If there's a conflict, generate a new unique username
        const newUsername = `${username}_${Math.random().toString(36).substring(2, 5)}`;
        const { data: newUser, error: retryError } = await supabase
          .from('chat_users')
          .insert([{ 
            username: newUsername,
            last_seen: new Date().toISOString()
          }])
          .select()
          .single();

        if (retryError) throw retryError;
        
        socket.username = newUsername;
        socket.userId = newUser.id;
        ioServer.emit('user_joined', newUser);
        return;
      }
      
      socket.username = data.username;
      socket.userId = data.id;
      ioServer.emit('user_joined', data);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  // Handle chat messages
  socket.on('chat_message', async (message) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: message,
          user_id: socket.userId
        })
        .select('*, chat_users(username)')
        .single();

      if (error) throw error;
      
      ioServer.emit('new_message', data);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  // Handle user disconnection
  socket.on('disconnect', async () => {
    if (socket.userId) {
      try {
        await supabase
          .from('chat_users')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', socket.userId);

        ioServer.emit('user_left', { userId: socket.userId });
      } catch (error) {
        console.error('Error updating last_seen:', error);
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Socket.IO Client Setup
const SOCKET_URL = 'https://localhost2.netlify.app';
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

export const connectSocket = (username) => {
  if (!socket.connected) {
    socket.connect();
    socket.emit('join', username);
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

// Socket event listeners
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
