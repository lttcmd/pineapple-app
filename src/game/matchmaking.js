// src/game/matchmaking.js
import { mem } from "../store/mem.js";
import { Events } from "../net/events.js";
import { id } from "../utils/ids.js";
import { createRoom } from "./state.js";
import { startRoundHandler } from "./rooms.js";
import { getUserChips, updateUserChips } from "../store/database.js";

// Queue of players searching for ranked matches
const rankedQueue = new Map(); // userId -> { socket, name, timestamp }

export async function searchRankedHandler(io, socket, { name }) {
  const userId = socket.user.sub;
  
  // Check if player has enough chips (500 chips required for ranked match)
  const dbId = socket.user.dbId;
  const currentChips = await getUserChips(dbId);
  
  if (currentChips < 500) {
    socket.emit(Events.ERROR, { message: "Need at least 500 chips to play ranked matches" });
    return;
  }
  
  // Remove from any existing queue
  rankedQueue.delete(userId);
  
  // Add to queue
  rankedQueue.set(userId, {
    socket,
    name: name || "Player",
    timestamp: Date.now(),
    dbId: dbId
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

async function checkForMatches(io) {
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
  
  // Add players to room with chip stakes
  const room = mem.rooms.get(roomId);
  if (room) {
    // Stake 500 chips from each player
    await updateUserChips(player1.dbId, -500);
    await updateUserChips(player2.dbId, -500);
    
    room.players.set(player1Id, {
      userId: player1Id,
      name: player1.name,
      socketId: player1.socket.id,
      board: { top: [], middle: [], bottom: [] },
      hand: [],
      discards: [],
      ready: false, // Will be set to ready after startRound
      currentDeal: [],
      score: 0,
      tableChips: 500, // Initial stake on table
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
      ready: false, // Will be set to ready after startRound
      currentDeal: [],
      score: 0,
      tableChips: 500, // Initial stake on table
      inFantasyland: false,
      hasPlayedFantasylandHand: false,
      roundComplete: false,
    });
    
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
      console.log(`🔍 RANKED MATCHMAKING: Auto-starting game for room ${roomId}`);
      console.log(`🔍 RANKED MATCHMAKING: Players in room:`, [...room.players.keys()]);
      console.log(`🔍 RANKED MATCHMAKING: Room phase: ${room.phase}`);
      
      // Add both players to nextRoundReady set for auto-start
      room.nextRoundReady.add(player1Id);
      room.nextRoundReady.add(player2Id);
      
      console.log(`🔍 RANKED MATCHMAKING: Added players to nextRoundReady:`, [...room.nextRoundReady]);
      
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
