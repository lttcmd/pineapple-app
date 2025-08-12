import { io } from "socket.io-client";
import * as SecureStore from "expo-secure-store";
import { SERVER_URL } from "../config/env";

let socket = null;
const listeners = new Set();

export async function connectSocket() {
  const token = await SecureStore.getItemAsync("ofc_jwt");
  if (!token) throw new Error("No auth token yet");
  if (socket) try { socket.disconnect(); } catch {}
  socket = io(SERVER_URL, { auth: { token } });

  socket.onAny((event, data) => {
    for (const l of listeners) l(event, data);
  });

  return socket;
}

export function onSocketEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(event, payload) {
  if (!socket) throw new Error("Socket not connected");
  socket.emit(event, payload);
}

export function getSocket() { return socket; }
