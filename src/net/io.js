import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { Events } from "./events.js";
import {
  createRoomHandler, joinRoomHandler, leaveRoomHandler,
  startRoundHandler, placeHandler, discardHandler, readyHandler,
  getRoomById
} from "../game/new/GameEngineAdapter.js";
import {
  searchRankedHandler, cancelSearchHandler, cleanupDisconnectedPlayer
} from "../game/matchmaking.js";

let ioInstance = null;

export function attachIO(httpServer) {
  const io = new Server(httpServer, { cors: { origin: "*" } });
  ioInstance = io;

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
    console.log(`🔌 SOCKET: Client connected: ${socket.user.sub}`);
    socket.emit(Events.AUTH_OK, { userId: socket.user.sub });

    socket.on(Events.CREATE_ROOM, () => {
      try {
        createRoomHandler(io, socket);
      } catch (error) {
        console.error('Error in CREATE_ROOM handler:', error);
        socket.emit(Events.ERROR, { message: 'Failed to create room' });
      }
    });
    
    socket.on(Events.JOIN_ROOM, (p) => {
      try {
        joinRoomHandler(io, socket, p);
      } catch (error) {
        console.error('Error in JOIN_ROOM handler:', error);
        socket.emit(Events.ERROR, { message: 'Failed to join room' });
      }
    });
    
    socket.on(Events.LEAVE_ROOM, (p) => {
      try {
        leaveRoomHandler(io, socket, p);
      } catch (error) {
        console.error('Error in LEAVE_ROOM handler:', error);
      }
    });
    
    socket.on(Events.START_ROUND, (p) => {
      try {
        startRoundHandler(io, socket, p);
      } catch (error) {
        console.error('Error in START_ROUND handler:', error);
        socket.emit(Events.ERROR, { message: 'Failed to start round' });
      }
    });

    socket.on(Events.PLACE, (p) => {
      try {
        placeHandler(io, socket, p);
      } catch (error) {
        console.error('Error in PLACE handler:', error);
        socket.emit(Events.ERROR, { message: 'Failed to place card' });
      }
    });
    
    socket.on(Events.DISCARD, (p) => {
      try {
        discardHandler(io, socket, p);
      } catch (error) {
        console.error('Error in DISCARD handler:', error);
        socket.emit(Events.ERROR, { message: 'Failed to discard card' });
      }
    });
    
    socket.on(Events.READY, (p) => {
      try {
        readyHandler(io, socket, p);
      } catch (error) {
        console.error('Error in READY handler:', error);
        socket.emit(Events.ERROR, { message: 'Failed to ready' });
      }
    });
    
    // Ranked matchmaking handlers
    socket.on(Events.SEARCH_RANKED, (p) => {
      try {
        searchRankedHandler(io, socket, p);
      } catch (error) {
        console.error('Error in SEARCH_RANKED handler:', error);
        socket.emit(Events.ERROR, { message: 'Failed to search for ranked match' });
      }
    });
    
    socket.on(Events.CANCEL_SEARCH, () => {
      try {
        cancelSearchHandler(io, socket);
      } catch (error) {
        console.error('Error in CANCEL_SEARCH handler:', error);
      }
    });
    
    // Clean up on disconnect
    socket.on('disconnect', () => {
      try {
        console.log(`🔌 SOCKET: Client disconnected: ${socket.user.sub}`);
        cleanupDisconnectedPlayer(socket.user.sub);
      } catch (error) {
        console.error('Error in disconnect handler:', error);
      }
    });
    
    // Timer sync handler
    socket.on(Events.TIMER_SYNC, () => {
      try {
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
          if (room && room.engine) {
            // Use GameEngine timer system
            const timerInfo = room.engine.getTimerInfo(socket.user.sub);
            if (timerInfo && timerInfo.isActive) {
              socket.emit(Events.TIMER_SYNC, {
                timeLeft: timerInfo.timeLeft,
                startTime: timerInfo.startTime,
                serverTime: Date.now()
              });
            }
          }
        }
      } catch (error) {
        console.error('Error in TIMER_SYNC handler:', error);
      }
    });
  });

  return io;
}

export function getIO() {
  return ioInstance;
}
