import { io } from 'socket.io-client';

const SOCKET_URL = 'https://reed-nu.vercel.app';
export const socket = io(SOCKET_URL, {
  transports: ["websocket"]
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
