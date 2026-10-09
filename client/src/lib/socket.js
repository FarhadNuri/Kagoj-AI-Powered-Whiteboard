import { io } from "socket.io-client";
import { getToken } from "./api";
import { neonEnabled, refreshNeonToken } from "./neonAuth";

const URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5050"
    : "https://kagoj-backend-oju1.onrender.com");

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(URL, {
      autoConnect: false,
      auth: { token: getToken() },
      transports: ["websocket"],
    });
  }
  return socket;
}

export async function connectSocket() {
  const s = getSocket();
  if (neonEnabled) await refreshNeonToken();
  s.auth = { token: getToken() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
}

export function getSocketId() {
  return socket?.connected ? socket.id : null;
}
