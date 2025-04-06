import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000'; // Replace with your server URL

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