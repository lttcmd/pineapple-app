// src/game/matchmaking.js
import { mem } from "../store/mem.js";
import { Events } from "../net/events.js";
import { id } from "../utils/ids.js";
import { createRoom } from "./state.js";
import { startRoundHandler } from "./rooms.js";

// Queue of players searching for ranked matches
const rankedQueue = new Map(); // userId -> { socket, name, timestamp }

export function searchRankedHandler(io, socket, { name }) {
  const userId = socket.user.sub;
  
  // Remove from any existing queue
  rankedQueue.delete(userId);
  
  // Add to queue
  rankedQueue.set(userId, {
    socket,
    name: name || "Player",
    timestamp: Date.now()
  });
  
  // Emit searching status
  socket.emit(Events.SEARCHING_STATUS, { searching: true });
  
  // Check for matches
  checkForMatches(io);
}

export function cancelSearchHandler(io, socket) {
  const userId = socket.user.sub;
  
  // Remove from queue
  rankedQueue.delete(userId);
  
  // Emit searching status
  socket.emit(Events.SEARCHING_STATUS, { searching: false });
}

function checkForMatches(io) {
  const queueEntries = Array.from(rankedQueue.entries());
  
  // Need at least 2 players to match
  if (queueEntries.length < 2) return;
  
  // Simple matching: take the first two players in queue
  const [player1Id, player1] = queueEntries[0];
  const [player2Id, player2] = queueEntries[1];
  
  // Remove both players from queue
  rankedQueue.delete(player1Id);
  rankedQueue.delete(player2Id);
  
  // Create a room for them
  const roomId = createRankedRoom();
  
  // Notify both players
  player1.socket.emit(Events.MATCH_FOUND, { 
    roomId,
    opponent: player2.name,
    searching: false 
  });
  
  player2.socket.emit(Events.MATCH_FOUND, { 
    roomId,
    opponent: player1.name,
    searching: false 
  });
  
  // Join both players to the room
  player1.socket.join(roomId);
  player2.socket.join(roomId);
  
  // Add players to room
  const room = mem.rooms.get(roomId);
  if (room) {
    room.players.set(player1Id, {
      userId: player1Id,
      name: player1.name,
      socketId: player1.socket.id,
      board: { top: [], middle: [], bottom: [] },
      hand: [],
      discards: [],
      ready: true, // Auto-ready for ranked matches
      currentDeal: [],
      score: 0,
      inFantasyland: false,
      hasPlayedFantasylandHand: false,
      roundComplete: false,
    });
    
    room.players.set(player2Id, {
      userId: player2Id,
      name: player2.name,
      socketId: player2.socket.id,
      board: { top: [], middle: [], bottom: [] },
      hand: [],
      discards: [],
      ready: true, // Auto-ready for ranked matches
      currentDeal: [],
      score: 0,
      inFantasyland: false,
      hasPlayedFantasylandHand: false,
      roundComplete: false,
    });
    
    // Add both players to nextRoundReady set for auto-start
    room.nextRoundReady.add(player1Id);
    room.nextRoundReady.add(player2Id);
    
    // Emit room state to both players
    io.to(roomId).emit(Events.ROOM_STATE, {
      roomId,
      players: Array.from(room.players.values()).map(p => ({
        userId: p.userId,
        name: p.name,
        score: p.score,
        ready: p.ready,
        inFantasyland: p.inFantasyland
      })),
      phase: room.phase,
      round: room.round,
      roundIndex: room.roundIndex
    });
    
    // Auto-start the game for ranked matches
    setTimeout(() => {
      startRoundHandler(io, player1.socket, { roomId });
    }, 1000); // Small delay to ensure room state is sent first
  }
}

function createRankedRoom() {
  const roomId = id(4);
  const room = createRoom(roomId);
  room.isRanked = true; // Mark as ranked room
  mem.rooms.set(roomId, room);
  
  return roomId;
}

// Clean up disconnected players from queue
export function cleanupDisconnectedPlayer(userId) {
  rankedQueue.delete(userId);
}
