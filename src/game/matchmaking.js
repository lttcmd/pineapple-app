// src/game/matchmaking.js
import { mem } from "../store/mem.js";
import { Events } from "../net/events.js";
import { id } from "../utils/ids.js";
import { startRoundHandler } from "./new/GameEngineAdapter.js";
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
  const roomId = await createRankedRoom(io);
  
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
    
    // Add players to GameEngine
    const engine = room.engine;
    const player1Data = engine.addPlayer(player1Id, player1.name, player1.socket.id, false);
    const player2Data = engine.addPlayer(player2Id, player2.name, player2.socket.id, false);
    
    // Emit room state to both players using GameEngine
    engine.emitGameState();
    
    // Auto-start the game for ranked matches
    setTimeout(() => {
      console.log(`🔍 RANKED MATCHMAKING: Auto-starting game for room ${roomId}`);
      console.log(`🔍 RANKED MATCHMAKING: Players in room:`, [...engine.gameState.players.keys()]);
      console.log(`🔍 RANKED MATCHMAKING: Room phase: ${engine.gameState.phase}`);
      
      // Add both players to nextRoundReady set for auto-start
      room.nextRoundReady.add(player1Id);
      room.nextRoundReady.add(player2Id);
      
      console.log(`🔍 RANKED MATCHMAKING: Added players to nextRoundReady:`, [...room.nextRoundReady]);
      
      startRoundHandler(io, player1.socket, { roomId });
    }, 1000); // Small delay to ensure room state is sent first
  }
}

async function createRankedRoom(io) {
  const roomId = id(4);
  
  // Use GameEngine system instead of old createRoom
  const { getOrCreateEngine } = await import('./new/GameEngineAdapter.js');
  const engine = getOrCreateEngine(roomId);
  
  // Set IO for the engine
  engine.setIO(io);
  
  // Store engine reference in mem for compatibility
  const room = {
    id: roomId,
    engine: engine,
    isRanked: true, // Mark as ranked room
    nextRoundReady: new Set()
  };
  
  mem.rooms.set(roomId, room);
  
  return roomId;
}

// Clean up disconnected players from queue
export function cleanupDisconnectedPlayer(userId) {
  rankedQueue.delete(userId);
}
