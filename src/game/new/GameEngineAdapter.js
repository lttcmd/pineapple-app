/**
 * GameEngineAdapter - Bridge between new GameEngine and existing socket handlers
 * Provides the same interface as the old room system but uses our clean architecture
 */

import { GameEngine } from './GameEngine.js';
import { mem } from '../../store/mem.js';
import { id } from '../../utils/ids.js';

// Map of room IDs to GameEngine instances
const engineMap = new Map();

/**
 * Get or create a GameEngine for a room
 */
export function getOrCreateEngine(roomId) {
  if (!engineMap.has(roomId)) {
    const engine = new GameEngine(roomId);
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
    engine: engine,
    // Legacy properties for compatibility
    phase: 'lobby',
    currentRound: 1,
    players: new Map(),
    timer: null
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
  
  // Update legacy room data for compatibility
  roomData.players.set(userId, {
    userId,
    name: player.name,
    socketId: socket.id,
    board: player.board,
    hand: player.hand,
    discards: player.discards,
    ready: player.ready,
    currentDeal: player.currentDeal,
    score: player.score,
    inFantasyland: player.inFantasyland,
    hasPlayedFantasylandHand: player.hasPlayedFantasylandHand,
    roundComplete: player.roundComplete
  });
  
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
  
  // Update legacy room data
  roomData.players.delete(userId);
  
  // Remove room if empty
  if (roomData.players.size === 0) {
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
  
  // Update legacy room data
  roomData.phase = engine.gameState.phase;
  roomData.currentRound = engine.gameState.currentRound;
  
  // Update player data in legacy format
  for (const [userId, player] of engine.gameState.players) {
    if (roomData.players.has(userId)) {
      const legacyPlayer = roomData.players.get(userId);
      legacyPlayer.board = player.board;
      legacyPlayer.hand = player.hand;
      legacyPlayer.discards = player.discards;
      legacyPlayer.ready = player.ready;
      legacyPlayer.currentDeal = player.currentDeal;
      legacyPlayer.inFantasyland = player.inFantasyland;
      legacyPlayer.hasPlayedFantasylandHand = player.hasPlayedFantasylandHand;
      legacyPlayer.roundComplete = player.roundComplete;
    }
  }
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
  
  // Update legacy room data
  const player = engine.gameState.getPlayer(userId);
  if (player && roomData.players.has(userId)) {
    const legacyPlayer = roomData.players.get(userId);
    legacyPlayer.board = player.board;
    legacyPlayer.hand = player.hand;
    legacyPlayer.discards = player.discards;
    legacyPlayer.ready = player.ready;
    legacyPlayer.currentDeal = player.currentDeal;
    legacyPlayer.roundComplete = player.roundComplete;
  }
  
  roomData.phase = engine.gameState.phase;
  roomData.currentRound = engine.gameState.currentRound;
  
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
  
  // Update legacy room data
  if (roomData.players.has(userId)) {
    const legacyPlayer = roomData.players.get(userId);
    legacyPlayer.board = player.board;
    legacyPlayer.hand = player.hand;
  }
  
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
  
  // Update legacy room data
  if (roomData.players.has(userId)) {
    const legacyPlayer = roomData.players.get(userId);
    legacyPlayer.hand = player.hand;
    legacyPlayer.discards = player.discards;
  }
  
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
    const hasExpired = engine.checkExpiredTimers();
    if (hasExpired) {
      // Update legacy room data after timer expiration
      const roomData = mem.rooms.get(roomId);
      if (roomData) {
        roomData.phase = engine.gameState.phase;
        roomData.currentRound = engine.gameState.currentRound;
        
        // Update player data
        for (const [userId, player] of engine.gameState.players) {
          if (roomData.players.has(userId)) {
            const legacyPlayer = roomData.players.get(userId);
            legacyPlayer.board = player.board;
            legacyPlayer.hand = player.hand;
            legacyPlayer.discards = player.discards;
            legacyPlayer.ready = player.ready;
            legacyPlayer.currentDeal = player.currentDeal;
            legacyPlayer.roundComplete = player.roundComplete;
          }
        }
      }
    }
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
