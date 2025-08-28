/**
 * GameState - Clean game state management
 * Handles overall game state, room management, and game flow
 */

import { PlayerState } from './PlayerState.js';
import { TimerState } from './TimerState.js';

export class GameState {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map(); // playerId -> PlayerState
    this.timers = new Map(); // playerId -> TimerState
    
    // Game flow state
    this.phase = 'lobby'; // lobby | playing | reveal
    this.currentRound = 1;
    this.handNumber = 1;
    this.handComplete = false;
    
    // Game mode
    this.isRanked = false;
    this.isMixedMode = false;
    
    // Deck management
    this.handCards = []; // 17 cards for this hand
    this.seed = null;
    
    // Next round ready tracking
    this.nextRoundReady = new Set(); // Set of playerIds ready for next round
  }
  
  /**
   * Add a player to the game
   */
  addPlayer(playerId, name, socketId, inFantasyland = false) {
    const player = new PlayerState(playerId, name, socketId, inFantasyland);
    this.players.set(playerId, player);
    
    // Update mixed mode status
    this.updateMixedModeStatus();
    
    return player;
  }
  
  /**
   * Remove a player from the game
   */
  removePlayer(playerId) {
    this.players.delete(playerId);
    this.timers.delete(playerId);
    this.nextRoundReady.delete(playerId);
    
    // Update mixed mode status
    this.updateMixedModeStatus();
  }
  
  /**
   * Get a player by ID
   */
  getPlayer(playerId) {
    return this.players.get(playerId);
  }
  
  /**
   * Get all players
   */
  getAllPlayers() {
    return Array.from(this.players.values());
  }
  
  /**
   * Get normal players (not in fantasyland)
   */
  getNormalPlayers() {
    return this.getAllPlayers().filter(p => !p.inFantasyland);
  }
  
  /**
   * Get fantasyland players
   */
  getFantasylandPlayers() {
    return this.getAllPlayers().filter(p => p.inFantasyland);
  }
  
  /**
   * Update mixed mode status
   */
  updateMixedModeStatus() {
    const hasNormal = this.getNormalPlayers().length > 0;
    const hasFantasyland = this.getFantasylandPlayers().length > 0;
    // Mixed mode only when there are BOTH normal AND fantasyland players
    // If ALL players are fantasyland, it's normal mode
    this.isMixedMode = hasNormal && hasFantasyland;
  }
  
  /**
   * Start a new hand
   */
  startNewHand() {
    this.phase = 'playing';
    this.currentRound = 1;
    this.handComplete = false;
    this.nextRoundReady.clear();
    
    // Generate seed for this hand
    this.seed = `${this.roomId}:${this.handNumber}:${Date.now()}`;
    
    // Reset all players for new hand
    for (const player of this.players.values()) {
      player.resetForNewHand();
    }
    
    // Clear all timers
    this.timers.clear();
    
    // Update mixed mode status after player reset
    this.updateMixedModeStatus();
    
    console.log(`🎮 NEW HAND: Started hand ${this.handNumber} for room ${this.roomId}`);
    console.log(`🎮 NEW HAND: Mixed mode: ${this.isMixedMode}`);
    console.log(`🎮 NEW HAND: Players: ${this.getAllPlayers().map(p => `${p.name}(${p.inFantasyland ? 'FL' : 'N'})`).join(', ')}`);
  }
  
  /**
   * End the current hand
   */
  endHand() {
    this.phase = 'reveal';
    this.handComplete = true;
    this.handNumber++;
    
    // Stop all timers
    for (const timer of this.timers.values()) {
      timer.stop();
    }
    
    console.log(`🎮 HAND END: Completed hand ${this.handNumber - 1} for room ${this.roomId}`);
  }
  
  /**
   * Start timer for a player
   */
  startTimer(playerId, phaseType) {
    const timer = TimerState.createForPhase(phaseType);
    this.timers.set(playerId, timer);
    
    console.log(`⏰ TIMER: Started ${phaseType} timer for player ${playerId} (${timer.durationMs}ms)`);
    return timer;
  }
  
  /**
   * Stop timer for a player
   */
  stopTimer(playerId) {
    const timer = this.timers.get(playerId);
    if (timer) {
      timer.stop();
      console.log(`⏰ TIMER: Stopped timer for player ${playerId}`);
    }
  }
  
  /**
   * Get timer for a player
   */
  getTimer(playerId) {
    return this.timers.get(playerId);
  }
  
  /**
   * Check if all players are ready
   */
  areAllPlayersReady() {
    return this.getAllPlayers().every(p => p.ready);
  }
  
  /**
   * Check if all players have completed their rounds
   */
  areAllPlayersComplete() {
    return this.getAllPlayers().every(p => p.isComplete());
  }
  
  /**
   * Check if game should proceed to reveal
   */
  shouldProceedToReveal() {
    if (this.isMixedMode) {
      const normalPlayers = this.getNormalPlayers();
      const fantasylandPlayers = this.getFantasylandPlayers();
      
      // In mixed mode, proceed when:
      // 1. Normal player has completed all rounds (17 cards) AND is ready
      // 2. Fantasyland player is ready
      const normalComplete = normalPlayers.every(p => p.isComplete() && p.ready);
      const fantasylandComplete = fantasylandPlayers.every(p => p.ready);
      
      return normalComplete && fantasylandComplete;
    } else {
      // In normal mode, proceed when all players are complete and ready
      return this.areAllPlayersComplete() && this.areAllPlayersReady();
    }
  }
  
  /**
   * Get expired timers
   */
  getExpiredTimers() {
    const expired = [];
    for (const [playerId, timer] of this.timers) {
      if (timer.isExpired()) {
        expired.push({ playerId, timer });
      }
    }
    return expired;
  }
  
  /**
   * Create public room state for clients
   */
  toPublicState() {
    return {
      roomId: this.roomId,
      phase: this.phase,
      round: this.handNumber,
      currentRound: this.currentRound,
      isRanked: this.isRanked,
      players: this.getAllPlayers().map(p => p.toPublicView())
    };
  }
  
  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      roomId: this.roomId,
      phase: this.phase,
      currentRound: this.currentRound,
      handNumber: this.handNumber,
      isMixedMode: this.isMixedMode,
      isRanked: this.isRanked,
      players: this.getAllPlayers().map(p => ({
        id: p.id,
        name: p.name,
        inFantasyland: p.inFantasyland,
        ready: p.ready,
        roundComplete: p.roundComplete,
        cardsDealt: p.cardsDealt,
        currentRound: p.getCurrentRound(),
        isComplete: p.isComplete(),
        hasTimer: this.timers.has(p.id),
        timerExpired: this.timers.get(p.id)?.isExpired() || false
      }))
    };
  }
}
