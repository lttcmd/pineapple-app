/**
 * GameEngine - Main game orchestrator
 * Uses clean core classes to manage the entire game flow
 */

import { GameState } from './GameState.js';
import { AutoPlacement } from './AutoPlacement.js';
import { checkFantasylandEligibility, checkFantasylandContinuation } from '../scoring.js';
import { makeDeck, shuffleDeterministic } from '../deck.js';

export class GameEngine {
  constructor(roomId) {
    this.gameState = new GameState(roomId);
    this.io = null; // Will be set by setIO method
  }
  
  /**
   * Set the Socket.IO instance for client communication
   */
  setIO(io) {
    this.io = io;
  }
  
  /**
   * Add a player to the game
   */
  addPlayer(playerId, name, socketId, inFantasyland = false) {
    const player = this.gameState.addPlayer(playerId, name, socketId, inFantasyland);
    console.log(`🎮 ENGINE: Added player ${name} (${inFantasyland ? 'Fantasyland' : 'Normal'}) to room ${this.gameState.roomId}`);
    return player;
  }
  
  /**
   * Remove a player from the game
   */
  removePlayer(playerId) {
    this.gameState.removePlayer(playerId);
    console.log(`🎮 ENGINE: Removed player ${playerId} from room ${this.gameState.roomId}`);
  }
  
  /**
   * Start a new hand
   */
  startNewHand() {
    console.log(`🎮 ENGINE: Starting new hand for room ${this.gameState.roomId}`);
    
    // Start the hand
    this.gameState.startNewHand();
    
    // Generate and shuffle deck
    this.generateHandCards();
    
    // Deal initial cards to all players
    this.dealInitialCards();
    
    // Start timers for all players
    this.startTimersForAllPlayers();
    
    // Emit round start event to all players
    if (this.io) {
      this.io.to(this.gameState.roomId).emit('round:start', {
        round: this.gameState.handNumber
      });
    }
    
    // Emit game state to all players
    this.emitGameState();
    
    console.log(`🎮 ENGINE: New hand started successfully`);
  }
  
  /**
   * Generate hand cards for this round
   */
  generateHandCards() {
    const deck = shuffleDeterministic(makeDeck(), this.gameState.seed);
    this.gameState.handCards = [];
    
    // Take first 17 cards for this hand
    for (let i = 0; i < 17; i++) {
      if (deck.length > 0) {
        this.gameState.handCards.push(deck.pop());
      }
    }
    
    console.log(`🎮 ENGINE: Generated ${this.gameState.handCards.length} hand cards`);
  }
  
  /**
   * Deal initial cards to all players
   */
  dealInitialCards() {
    const fantasylandPlayers = this.gameState.getFantasylandPlayers();
    const normalPlayers = this.gameState.getNormalPlayers();
    
    // Deal to fantasyland players first (they get 14 cards)
    for (const player of fantasylandPlayers) {
      const cards = this.gameState.handCards.slice(0, 14);
      player.addCards(cards);
      console.log(`🎮 ENGINE: Dealt ${cards.length} cards to fantasyland player ${player.name}: [${cards.join(', ')}]`);
    }
    
    // Deal to normal players (they get 5 cards for initial set)
    for (const player of normalPlayers) {
      const cards = this.gameState.handCards.slice(0, 5);
      player.addCards(cards);
      console.log(`🎮 ENGINE: Dealt ${cards.length} cards to normal player ${player.name}: [${cards.join(', ')}]`);
    }
  }
  
  /**
   * Start timers for all players
   */
  startTimersForAllPlayers() {
    for (const player of this.gameState.getAllPlayers()) {
      const phaseType = player.getPhaseType();
      const timer = this.gameState.startTimer(player.id, phaseType);
      
      // Emit timer start to this player
      if (this.io) {
        this.io.to(player.socketId).emit('timer:start', timer.toClientInfo());
      }
      
      console.log(`🎮 ENGINE: Started ${phaseType} timer for ${player.name} (${timer.durationMs}ms)`);
    }
  }
  
  /**
   * Handle player ready action
   */
  handlePlayerReady(playerId, placements, discard) {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      console.error(`🎮 ENGINE: Player ${playerId} not found`);
      return false;
    }
    
    console.log(`🎮 ENGINE: Player ${player.name} ready with ${placements.length} placements`);
    
    // Apply player's placements
    player.placeCards(placements);
    
    // Handle discard if provided
    if (discard) {
      player.discardCard(discard);
    }
    
    // Mark player as ready
    player.markReady();
    
    // Stop player's timer
    this.gameState.stopTimer(playerId);
    
    // Emit timer expired to this player
    if (this.io) {
      this.io.to(player.socketId).emit('timer:expired', {
        phaseType: player.getPhaseType(),
        autoPlacedPlayers: []
      });
    }
    
    // Check if we need to advance the game
    this.checkGameProgression();
    
    // Emit updated game state
    this.emitGameState();
    
    return true;
  }
  
  /**
   * Handle timer expiration (auto-placement)
   */
  handleTimerExpiration(playerId) {
    const player = this.gameState.getPlayer(playerId);
    const timer = this.gameState.getTimer(playerId);
    
    if (!player || !timer) {
      console.error(`🎮 ENGINE: Player ${playerId} or timer not found for expiration`);
      return;
    }
    
    console.log(`🎮 ENGINE: Timer expired for ${player.name}, phase: ${timer.phaseType}`);
    
    // Auto-place cards
    const autoPlacementResult = AutoPlacement.autoPlaceCards(player, timer.phaseType);
    AutoPlacement.applyAutoPlacement(player, autoPlacementResult);
    
    // Stop the timer
    this.gameState.stopTimer(playerId);
    
    // Emit auto-placement notification to player
    if (this.io) {
      this.io.to(player.socketId).emit('action:applied', {
        ...AutoPlacement.getClientNotification(autoPlacementResult),
        board: player.board,
        hand: player.hand,
        discards: player.discards
      });
      
      this.io.to(player.socketId).emit('timer:expired', {
        phaseType: timer.phaseType,
        autoPlacedPlayers: [playerId]
      });
    }
    
    // Check if we need to advance the game
    this.checkGameProgression();
    
    // Emit updated game state
    this.emitGameState();
  }
  
  /**
   * Check if game should progress to next round or reveal
   */
  checkGameProgression() {
    console.log(`🎮 ENGINE: Checking game progression...`);
    
    // Check if we should proceed to reveal
    if (this.gameState.shouldProceedToReveal()) {
      console.log(`🎮 ENGINE: All players ready - proceeding to reveal`);
      this.proceedToReveal();
      return;
    }
    
    // Check if we need to advance normal players to next round
    if (this.gameState.isMixedMode) {
      this.handleMixedModeProgression();
    } else {
      this.handleNormalModeProgression();
    }
  }
  
  /**
   * Handle mixed mode progression (Normal vs Fantasyland)
   */
  handleMixedModeProgression() {
    const normalPlayers = this.gameState.getNormalPlayers();
    const fantasylandPlayers = this.gameState.getFantasylandPlayers();
    
    console.log(`🎮 ENGINE: Mixed mode progression check`);
    console.log(`🎮 ENGINE: Normal players: ${normalPlayers.map(p => `${p.name}(${p.ready ? 'R' : 'NR'})`).join(', ')}`);
    console.log(`🎮 ENGINE: Fantasyland players: ${fantasylandPlayers.map(p => `${p.name}(${p.ready ? 'R' : 'NR'})`).join(', ')}`);
    
    // Handle normal players - they advance independently (except round 5)
    for (const player of normalPlayers) {
      if (player.ready && !player.isComplete()) {
        const currentRound = player.getCurrentRound();
        console.log(`🎮 ENGINE: Normal player ${player.name} ready in round ${currentRound}, isComplete: ${player.isComplete()}`);
        
        // In round 5, normal player must wait for fantasyland player to be ready
        if (currentRound === 5) {
          const fantasylandReady = fantasylandPlayers.every(p => p.ready);
          if (!fantasylandReady) {
            console.log(`🎮 ENGINE: Normal player ${player.name} in round 5, waiting for fantasyland player`);
            continue;
          }
        }
        
        const cardsNeeded = player.getCardsNeededForNextRound();
        if (cardsNeeded > 0) {
          console.log(`🎮 ENGINE: Normal player ${player.name} advancing to next round, needs ${cardsNeeded} cards`);
          this.dealNextRoundCards(player);
        } else {
          console.log(`🎮 ENGINE: Normal player ${player.name} no cards needed for next round`);
        }
      }
    }
    
    // Handle fantasyland players - they only advance if they need cards (shouldn't happen in mixed mode)
    for (const player of fantasylandPlayers) {
      if (player.ready && !player.isComplete()) {
        const cardsNeeded = player.getCardsNeededForNextRound();
        console.log(`🎮 ENGINE: Fantasyland player ${player.name} ready, cardsNeeded: ${cardsNeeded}, isComplete: ${player.isComplete()}`);
        if (cardsNeeded > 0) {
          console.log(`🎮 ENGINE: Fantasyland player ${player.name} advancing to next round`);
          this.dealNextRoundCards(player);
        } else {
          console.log(`🎮 ENGINE: Fantasyland player ${player.name} no cards needed for next round`);
        }
      }
    }
    
    // Check if all players are ready to advance to reveal
    const allReady = this.gameState.players.size > 0 && 
                    Array.from(this.gameState.players.values()).every(p => p.ready);
    
    console.log(`🎮 ENGINE: All players ready check: ${allReady} (${this.gameState.players.size} total players)`);
    
    if (allReady) {
      console.log(`🎮 ENGINE: All players ready - proceeding to reveal`);
      this.proceedToReveal();
    }
  }
  
  /**
   * Handle normal mode progression (Normal vs Normal)
   */
  handleNormalModeProgression() {
    // In normal mode, ALL players must be ready to advance to next round
    if (this.gameState.areAllPlayersReady()) {
      console.log(`🎮 ENGINE: All players ready in normal mode - advancing to next round`);
      
      // Deal next round cards to all players
      for (const player of this.gameState.getAllPlayers()) {
        if (!player.isComplete()) {
          const cardsNeeded = player.getCardsNeededForNextRound();
          if (cardsNeeded > 0) {
            console.log(`🎮 ENGINE: Dealing ${cardsNeeded} cards to ${player.name} for next round`);
            this.dealNextRoundCards(player);
          }
        }
      }
    } else {
      console.log(`🎮 ENGINE: Not all players ready yet - waiting for all players to be ready`);
    }
  }
  
  /**
   * Deal next round cards to a player
   */
  dealNextRoundCards(player) {
    const cardsNeeded = player.getCardsNeededForNextRound();
    console.log(`🎮 ENGINE: dealNextRoundCards called for ${player.name} (Fantasyland: ${player.inFantasyland}, cardsDealt: ${player.cardsDealt})`);
    console.log(`🎮 ENGINE: Cards needed: ${cardsNeeded}`);
    
    if (cardsNeeded === 0) {
      console.log(`🎮 ENGINE: Player ${player.name} doesn't need more cards`);
      return;
    }
    
    // Calculate starting index for this round
    // For normal players: Round 1 = cards 0-4 (5 cards), Round 2 = cards 5-7 (3 cards), etc.
    // For fantasyland players: All 14 cards at once (cards 0-13)
    let startIndex;
    if (player.inFantasyland) {
      startIndex = 0; // Fantasyland gets all 14 cards at once
      console.log(`🎮 ENGINE: Fantasyland player - using startIndex: ${startIndex}`);
    } else {
      // Normal players: calculate based on cards already dealt (next round)
      let nextRound;
      if (player.cardsDealt <= 5) {
        nextRound = 2;  // After initial set (5 cards), next is round 2
      } else if (player.cardsDealt <= 8) {
        nextRound = 3;  // After round 2 (8 cards), next is round 3
      } else if (player.cardsDealt <= 11) {
        nextRound = 4;  // After round 3 (11 cards), next is round 4
      } else if (player.cardsDealt <= 14) {
        nextRound = 5;  // After round 4 (14 cards), next is round 5
      } else if (player.cardsDealt <= 17) {
        nextRound = 0;  // After round 5 (17 cards), done
      } else {
        console.error(`🎮 ENGINE: Invalid cardsDealt ${player.cardsDealt} for player ${player.name}`);
        return;
      }
      
      console.log(`🎮 ENGINE: Normal player - calculated nextRound: ${nextRound}`);
      
      if (nextRound === 2) {
        startIndex = 5; // Round 2: cards 5-7
      } else if (nextRound === 3) {
        startIndex = 8; // Round 3: cards 8-10
      } else if (nextRound === 4) {
        startIndex = 11; // Round 4: cards 11-13
      } else if (nextRound === 5) {
        startIndex = 14; // Round 5: cards 14-16
      } else {
        console.error(`🎮 ENGINE: Invalid next round ${nextRound} for player ${player.name}`);
        return;
      }
      
      console.log(`🎮 ENGINE: Normal player - calculated startIndex: ${startIndex}`);
    }
    
    const cards = this.gameState.handCards.slice(startIndex, startIndex + cardsNeeded);
    console.log(`🎮 ENGINE: Round cards: [${cards.join(', ')}] (startIndex: ${startIndex}, cardsNeeded: ${cardsNeeded})`);
    
    // Add cards to player
    console.log(`🎮 ENGINE: Calling addCards for ${player.name}`);
    player.addCards(cards);
    player.resetReady();
    
    // Start new timer for this player
    const phaseType = player.getPhaseType();
    const timer = this.gameState.startTimer(player.id, phaseType);
    
    // Calculate the round number for logging
    let roundForLog;
    if (player.inFantasyland) {
      roundForLog = 'fantasyland';
    } else {
      if (player.cardsDealt <= 5) {
        roundForLog = 2;  // After initial set, next is round 2
      } else if (player.cardsDealt <= 8) {
        roundForLog = 3;  // After round 2, next is round 3
      } else if (player.cardsDealt <= 11) {
        roundForLog = 4;  // After round 3, next is round 4
      } else if (player.cardsDealt <= 14) {
        roundForLog = 5;  // After round 4, next is round 5
      } else {
        roundForLog = 'complete';
      }
    }
    
    console.log(`🎮 ENGINE: Dealt ${cards.length} cards to ${player.name} for round ${roundForLog}: [${cards.join(', ')}]`);
    
    // Emit new cards and timer to player
    if (this.io) {
      this.io.to(player.socketId).emit('round:deal', {
        cards: cards,
        fantasyland: player.inFantasyland,
        round: roundForLog
      });
      
      this.io.to(player.socketId).emit('timer:start', timer.toClientInfo());
    }
  }
  
  /**
   * Proceed to reveal phase
   */
  proceedToReveal() {
    console.log(`🎮 ENGINE: Proceeding to reveal phase`);
    
    // End the current hand
    this.gameState.endHand();
    
    // Check fantasyland qualification for next hand
    const fantasylandQualifiers = [];
    for (const [playerId, player] of this.gameState.players) {
      let qualifiesForFantasyland = false;
      
      if (player.inFantasyland) {
        // Already in fantasyland - check if they stay in
        qualifiesForFantasyland = checkFantasylandContinuation(player.board);
        if (qualifiesForFantasyland) {
          console.log(`🎮 ENGINE: Player ${player.name} stays in fantasyland`);
        } else {
          console.log(`🎮 ENGINE: Player ${player.name} exits fantasyland`);
        }
      } else {
        // Not in fantasyland - check if they qualify
        qualifiesForFantasyland = checkFantasylandEligibility(player.board);
        if (qualifiesForFantasyland) {
          console.log(`🎮 ENGINE: Player ${player.name} qualifies for fantasyland!`);
          fantasylandQualifiers.push(playerId);
        }
      }
      
      // Update player's fantasyland status for next hand
      player.inFantasyland = qualifiesForFantasyland;
      if (qualifiesForFantasyland && !player.hasPlayedFantasylandHand) {
        player.hasPlayedFantasylandHand = false; // Reset for next hand
      }
    }
    
    // Prepare board data for reveal
    const boards = [];
    for (const [playerId, player] of this.gameState.players) {
      boards.push({
        userId: playerId,
        name: player.name,
        board: {
          top: [...player.board.top],
          middle: [...player.board.middle],
          bottom: [...player.board.bottom]
        },
        valid: true, // TODO: Implement validation
        reason: null
      });
    }
    
    // Emit reveal event to all players
    if (this.io) {
      this.io.to(this.gameState.roomId).emit('round:reveal', {
        roomId: this.gameState.roomId,
        handNumber: this.gameState.handNumber - 1,
        boards: boards,
        results: {}, // TODO: Implement scoring
        fantasyland: fantasylandQualifiers
      });
    }
    
    // Emit updated game state
    this.emitGameState();
    
    // Start 10-second timer for auto-advance to next hand
    setTimeout(() => {
      console.log(`🎮 ENGINE: Reveal timer expired - auto-starting next hand`);
      this.startNewHand();
    }, 10000);
    
    // Emit reveal timer to all players
    if (this.io) {
      const revealTimer = {
        deadlineEpochMs: Date.now() + 10000,
        durationMs: 10000,
        phaseType: 'reveal'
      };
      this.io.to(this.gameState.roomId).emit('timer:start', revealTimer);
    }
  }
  
  /**
   * Emit game state to all players
   */
  emitGameState() {
    if (!this.io) return;
    
    const publicState = this.gameState.toPublicState();
    this.io.to(this.gameState.roomId).emit('room:state', publicState);
    
    // Also emit individual player state to each player
    for (const [playerId, player] of this.gameState.players) {
      const playerState = player.toClientState();
      this.io.to(player.socketId).emit('player:state', playerState);
    }
  }
  
  /**
   * Get debug info
   */
  getDebugInfo() {
    return this.gameState.getDebugInfo();
  }
  
  /**
   * Check for expired timers (called periodically by server)
   */
  checkExpiredTimers() {
    const expiredTimers = this.gameState.getExpiredTimers();
    
    for (const { playerId, timer } of expiredTimers) {
      console.log(`🎮 ENGINE: Timer expired for player ${playerId}`);
      this.handleTimerExpiration(playerId);
    }
    
    return expiredTimers.length > 0;
  }
}
