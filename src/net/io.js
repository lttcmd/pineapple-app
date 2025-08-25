import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { Events } from "./events.js";
import {
  createRoomHandler, joinRoomHandler, leaveRoomHandler,
  startRoundHandler, placeHandler, discardHandler, readyHandler,
  getRoomById
} from "../game/rooms.js";
import {
  searchRankedHandler, cancelSearchHandler, cleanupDisconnectedPlayer
} from "../game/matchmaking.js";

export function attachIO(httpServer) {
  const io = new Server(httpServer, { cors: { origin: "*" } });

  // Expect { auth: { token } } from client
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("auth required"));
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      socket.user = payload; // { sub, phone }
      next();
    } catch {
      next(new Error("invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.emit(Events.AUTH_OK, { userId: socket.user.sub });

    socket.on(Events.CREATE_ROOM, () => createRoomHandler(io, socket));
    socket.on(Events.JOIN_ROOM, (p) => joinRoomHandler(io, socket, p));
    socket.on(Events.LEAVE_ROOM, (p) => leaveRoomHandler(io, socket, p));
    socket.on(Events.START_ROUND, (p) => startRoundHandler(io, socket, p));

    socket.on(Events.PLACE, (p) => placeHandler(io, socket, p));
    socket.on(Events.DISCARD, (p) => discardHandler(io, socket, p));
    socket.on(Events.READY, (p) => readyHandler(io, socket, p));
    
    // Ranked matchmaking handlers
    socket.on(Events.SEARCH_RANKED, (p) => searchRankedHandler(io, socket, p));
    socket.on(Events.CANCEL_SEARCH, () => cancelSearchHandler(io, socket));
    
    // Clean up on disconnect
    socket.on('disconnect', () => {
      cleanupDisconnectedPlayer(socket.user.sub);
    });
    
    // Timer sync handler
    socket.on(Events.TIMER_SYNC, () => {
      // Find the room this socket is in
      const rooms = io.sockets.adapter.rooms;
      let roomId = null;
      for (const [room, sockets] of rooms) {
        if (sockets.has(socket.id)) {
          roomId = room;
          break;
        }
      }
      
      if (roomId && roomId !== socket.id) { // socket.id is not a room
        const room = getRoomById(roomId);
        if (room && room.timer.isActive) {
          socket.emit(Events.TIMER_SYNC, {
            timeLeft: room.timer.timeLeft,
            startTime: room.timer.startTime,
            serverTime: Date.now()
          });
        }
      }
    });
  });

  return io;
}
