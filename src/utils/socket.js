import { io } from 'socket.io-client';
import { SOCKET_URL, getAdminToken } from './api';

let adminSocket = null;
let publicSocket = null;

/**
 * Get or create authenticated Admin Socket.IO connection
 */
export function getAdminSocket() {
  const token = getAdminToken();
  if (!token) return null;

  if (adminSocket && adminSocket.connected) {
    return adminSocket;
  }

  if (!adminSocket) {
    adminSocket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    adminSocket.on('connect', () => {
      // Admin socket connected
    });

    adminSocket.on('connect_error', (err) => {
      console.warn('Admin Socket connection warning:', err.message);
    });
  }

  return adminSocket;
}

/**
 * Disconnect and cleanup Admin Socket.IO connection
 */
export function disconnectAdminSocket() {
  if (adminSocket) {
    adminSocket.disconnect();
    adminSocket = null;
  }
}

/**
 * Get or create unauthenticated Public Socket.IO connection for the live counter
 */
export function getPublicSocket() {
  if (publicSocket && publicSocket.connected) {
    return publicSocket;
  }

  if (!publicSocket) {
    publicSocket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10000,
      transports: ['websocket', 'polling'],
    });

    publicSocket.on('connect_error', (err) => {
      console.warn('Public Socket connection warning:', err.message);
    });
  }

  return publicSocket;
}
