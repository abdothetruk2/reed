import { io } from 'socket.io-client';

const SOCKET_URL = 'https://reed.fly.dev'; // Replace with your server URL

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true
});

export const connectSocket = (username) => {
  socket.auth = { username };
  socket.connect();
};

export const disconnectSocket = () => {
  socket.disconnect();
};  
