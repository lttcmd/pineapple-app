/**
 * GameEngineAdapter - Bridge between new GameEngine and existing socket handlers
 * Provides the same interface as the old room system but uses our clean architecture
 */

import { GameEngine } from './GameEngine.js';
import { mem } from '../../store/mem.js';
import { id } from '../../utils/ids.js';
import { updateStatsFromReveal } from '../stats.js';
import { getUserByPhone, recordMatchEnd } from '../../store/database.js';

// Map of room IDs to GameEngine instances
const engineMap = new Map();

/**
 * Get or create a GameEngine for a room
 */
export function getOrCreateEngine(roomId) {
  if (!engineMap.has(roomId)) {
    const engine = new GameEngine(roomId);
    // Set up callbacks for stats tracking
    engine.setRevealCallback((revealData) => updateRoomStats(roomId, revealData));
    engine.setGameEndCallback((gameEndResult) => updateMatchStats(roomId, gameEndResult));
    // We'll set IO later when it's available
    engineMap.set(roomId, engine);
  }
  return engineMap.get(roomId);
}

/**
 * Remove engine when room is deleted
 */
function removeEngine(roomId) {
  engineMap.delete(roomId);
}

/**
 * Update player stats from reveal data
 */
async function updateRoomStats(roomId, revealData) {
  try {
    const engine = engineMap.get(roomId);
    if (!engine) return;

    // Create player mapping (userId -> dbId)
    const playerMap = new Map();
    
    for (const [userId, player] of engine.gameState.players) {
      const playerData = mem.players.get(userId);
      if (playerData && playerData.phone) {
        const dbUser = await getUserByPhone(playerData.phone);
        if (dbUser) {
          playerMap.set(userId, dbUser.id);
        }
      }
    }

    if (playerMap.size > 0) {
      await updateStatsFromReveal(revealData, playerMap);
      console.log(`✅ Updated stats for room ${roomId} with ${playerMap.size} players`);
    }
  } catch (error) {
    console.error(`❌ Error updating stats for room ${roomId}:`, error);
  }
}

/**
 * Update match stats when a ranked match ends
 */
async function updateMatchStats(roomId, gameEndResult) {
  try {
    const engine = engineMap.get(roomId);
    if (!engine) return;

    // Only track stats for ranked matches
    const roomData = mem.rooms.get(roomId);
    if (!roomData || !roomData.isRanked) return;

    const { winner, loser } = gameEndResult;
    if (!winner || !loser) return;

    // Create player mapping (userId -> dbId)
    const playerMap = new Map();
    
    for (const [userId, player] of engine.gameState.players) {
      const playerData = mem.players.get(userId);
      if (playerData && playerData.phone) {
        const dbUser = await getUserByPhone(playerData.phone);
        if (dbUser) {
          playerMap.set(userId, dbUser.id);
        }
      }
    }

    const winnerDbId = playerMap.get(winner.userId);
    const loserDbId = playerMap.get(loser.userId);

    if (winnerDbId && loserDbId) {
      await recordMatchEnd(winnerDbId, loserDbId);
      console.log(`✅ Recorded match end stats for room ${roomId}: Winner ${winner.name}, Loser ${loser.name}`);
    }
  } catch (error) {
    console.error(`❌ Error updating match stats for room ${roomId}:`, error);
  }
}

/**
 * Create a new room using GameEngine
 */
export function createRoomHandler(io, socket) {
  const roomId = id(4);
  const engine = getOrCreateEngine(roomId);
  
  // Set IO for the engine
  engine.setIO(io);
  
  // Store engine reference in mem for compatibility
  mem.rooms.set(roomId, {
    id: roomId,
    engine: engine
  });
  
  socket.emit('create-room', { roomId });
}

/**
 * Join an existing room using GameEngine
 */
export function joinRoomHandler(io, socket, { roomId, name }) {
  const roomData = mem.rooms.get(roomId);
  if (!roomData) {
    return socket.emit('error', { message: "Room not found" });
  }
  
  const engine = roomData.engine;
  const userId = socket.user.sub;
  
  // Add player to engine
  const player = engine.addPlayer(userId, name || ("Player-" + userId.slice(-4)), socket.id, false);
  
  // Join socket room
  socket.join(roomId);
  
  // Emit room state
  engine.emitGameState();
}

/**
 * Leave room using GameEngine
 */
export function leaveRoomHandler(io, socket, { roomId }) {
  const roomData = mem.rooms.get(roomId);
  if (!roomData) return;
  
  const engine = roomData.engine;
  const userId = socket.user.sub;
  
  // Remove player from engine
  engine.removePlayer(userId);
  
  // Leave socket room
  socket.leave(roomId);
  
  // Remove room if empty
  if (engine.gameState.players.size === 0) {
    mem.rooms.delete(roomId);
    removeEngine(roomId);
  } else {
    engine.emitGameState();
  }
}

/**
 * Start a new round using GameEngine
 */
export function startRoundHandler(io, socket, { roomId }) {
  const roomData = mem.rooms.get(roomId);
  if (!roomData) {
    return socket.emit('error', { message: "Room not found" });
  }
  
  const engine = roomData.engine;
  
  // Start new hand
  engine.startNewHand();
}

/**
 * Handle player ready action using GameEngine
 */
export function readyHandler(io, socket, { roomId, placements, discard }) {
  console.log(`🎯 SERVER: Ready handler called for room ${roomId}, placements:`, placements, 'discard:', discard);
  
  const roomData = mem.rooms.get(roomId);
  if (!roomData) {
    console.log(`🎯 SERVER: Room ${roomId} not found`);
    return socket.emit('error', { message: "Room not found" });
  }
  
  const engine = roomData.engine;
  const userId = socket.user.sub;
  
  // Handle ready action in engine
  console.log(`🎯 SERVER: Calling handlePlayerReady for user ${userId}`);
  const success = engine.handlePlayerReady(userId, placements, discard);
  
  if (!success) {
    console.log(`🎯 SERVER: handlePlayerReady failed for user ${userId}`);
    return socket.emit('error', { message: "Player not found" });
  }
  
  console.log(`🎯 SERVER: handlePlayerReady succeeded for user ${userId}`);
  
  // Emit updated game state
  engine.emitGameState();
}

/**
 * Handle card placement using GameEngine
 */
export function placeHandler(io, socket, { roomId, placements }) {
  const roomData = mem.rooms.get(roomId);
  if (!roomData) {
    return socket.emit('error', { message: "Room not found" });
  }
  
  const engine = roomData.engine;
  const userId = socket.user.sub;
  const player = engine.gameState.getPlayer(userId);
  
  if (!player) {
    return socket.emit('error', { message: "Player not found" });
  }
  
  // Apply placements
  player.placeCards(placements);
  
  // Emit updated state
  engine.emitGameState();
}

/**
 * Handle card discard using GameEngine
 */
export function discardHandler(io, socket, { roomId, card }) {
  const roomData = mem.rooms.get(roomId);
  if (!roomData) {
    return socket.emit('error', { message: "Room not found" });
  }
  
  const engine = roomData.engine;
  const userId = socket.user.sub;
  const player = engine.gameState.getPlayer(userId);
  
  if (!player) {
    return socket.emit('error', { message: "Player not found" });
  }
  
  // Apply discard
  player.discardCard(card);
  
  // Emit updated state
  engine.emitGameState();
}

/**
 * Get room by ID (compatibility function)
 */
export function getRoomById(roomId) {
  return mem.rooms.get(roomId);
}

/**
 * Check for expired timers (called by server setInterval)
 */
export function checkExpiredTimers() {
  for (const [roomId, engine] of engineMap) {
    engine.checkExpiredTimers();
  }
}

/**
 * Get debug info for monitoring
 */
export function getDebugInfo() {
  const debugInfo = {};
  for (const [roomId, engine] of engineMap) {
    debugInfo[roomId] = engine.getDebugInfo();
  }
  return debugInfo;
}
