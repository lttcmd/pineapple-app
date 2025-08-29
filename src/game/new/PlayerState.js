/**
 * PlayerState - Clean player state management
 * Handles all player-specific data and operations
 */

import { CHIP_CONSTANTS } from '../constants.js';

export class PlayerState {
  constructor(playerId, name, socketId, inFantasyland = false) {
    this.id = playerId;
    this.name = name;
    this.socketId = socketId;
    this.inFantasyland = inFantasyland;
    
    // Game state
    this.board = { top: [], middle: [], bottom: [] };
    this.hand = [];
    this.discards = [];
    this.ready = false;
    this.roundComplete = false;
    
    // Card tracking
    this.cardsDealt = 0; // Total cards dealt to this player (1-17 for normal, 1-14 for fantasyland)
    this.currentDeal = []; // Cards from current deal (for UI)
    
    // Fantasyland tracking
    this.hasPlayedFantasylandHand = false;
    
    // Chip tracking (for ranked matches)
    this.score = 0;
    this.tableChips = CHIP_CONSTANTS.STARTING_CHIPS; // Starting chips
    console.log(`💰 PLAYER STATE: ${this.name} initialized with ${this.tableChips} chips`);
  }
  
  /**
   * Reset player state for a new hand
   */
  resetForNewHand() {
    this.board = { top: [], middle: [], bottom: [] };
    this.hand = [];
    this.discards = [];
    this.ready = false;
    this.roundComplete = false;
    this.cardsDealt = 0;
    this.currentDeal = [];
    
    // Preserve fantasyland status and chips
    // this.inFantasyland remains unchanged
    // this.tableChips remains unchanged
  }
  
  /**
   * Add cards to player's hand
   */
  addCards(cards) {
    console.log(`🎯 PLAYER STATE: addCards called for ${this.name} (Fantasyland: ${this.inFantasyland}, cardsDealt: ${this.cardsDealt})`);
    console.log(`🎯 PLAYER STATE: Current hand: [${this.hand.join(', ')}]`);
    console.log(`🎯 PLAYER STATE: New cards: [${cards.join(', ')}]`);
    
    // For fantasyland players, only replace hand on initial fantasyland deal
    // For normal players, append to existing hand
    if (this.inFantasyland && this.cardsDealt === 0) {
      // Initial fantasyland deal - replace hand
      console.log(`🎯 PLAYER STATE: Fantasyland initial deal - replacing hand`);
      this.hand = [...cards];
    } else {
      // Normal players or subsequent fantasyland rounds - append to existing hand
      console.log(`🎯 PLAYER STATE: ${this.inFantasyland ? 'Fantasyland subsequent round' : 'Normal player'} - appending to hand`);
      this.hand.push(...cards);
    }
    
    this.cardsDealt += cards.length;
    this.currentDeal = cards;
    
    console.log(`🎯 PLAYER STATE: Final hand: [${this.hand.join(', ')}] (${this.hand.length} cards)`);
    console.log(`🎯 PLAYER STATE: cardsDealt: ${this.cardsDealt}, currentDeal: [${this.currentDeal.join(', ')}]`);
  }
  
  /**
   * Place cards on board
   */
  placeCards(placements) {
    for (const placement of placements) {
      const cardIndex = this.hand.indexOf(placement.card);
      if (cardIndex !== -1) {
        this.hand.splice(cardIndex, 1);
        this.board[placement.row].push(placement.card);
      }
    }
  }
  
  /**
   * Discard a card
   */
  discardCard(card) {
    const cardIndex = this.hand.indexOf(card);
    if (cardIndex !== -1) {
      this.hand.splice(cardIndex, 1);
      this.discards.push(card);
    }
  }
  
  /**
   * Mark player as ready
   */
  markReady() {
    this.ready = true;
    this.roundComplete = true;
    
    // If this is a fantasyland player and they have 14 cards, mark as having played fantasyland hand
    if (this.inFantasyland && this.cardsDealt === 14) {
      this.hasPlayedFantasylandHand = true;
    }
  }
  
  /**
   * Reset ready state (for next round)
   */
  resetReady() {
    this.ready = false;
    this.roundComplete = false;
    this.currentDeal = [];
  }
  
  /**
   * Get current round based on cards dealt
   */
  getCurrentRound() {
    if (this.inFantasyland) {
      return this.hasPlayedFantasylandHand ? 0 : 1; // 0 = done, 1 = fantasyland round
    } else {
      if (this.cardsDealt <= 5) return 1;      // Initial set
      if (this.cardsDealt <= 8) return 2;      // Round 2
      if (this.cardsDealt <= 11) return 3;     // Round 3
      if (this.cardsDealt <= 14) return 4;     // Round 4
      if (this.cardsDealt <= 17) return 5;     // Round 5
      return 0; // Done
    }
  }
  
  /**
   * Check if player has completed all their rounds
   */
  isComplete() {
    if (this.inFantasyland) {
      return this.hasPlayedFantasylandHand;
    } else {
      return this.cardsDealt >= 17;
    }
  }
  
  /**
   * Get number of cards needed for next round
   */
  getCardsNeededForNextRound() {
    if (this.inFantasyland) {
      // Fantasyland players get 14 cards once, then no more cards
      return this.cardsDealt === 0 ? 14 : 0;
    } else {
      // Calculate the next round based on cards already dealt
      let nextRound;
      if (this.cardsDealt <= 5) {
        nextRound = 2;  // After initial set (5 cards), next is round 2
      } else if (this.cardsDealt <= 8) {
        nextRound = 3;  // After round 2 (8 cards), next is round 3
      } else if (this.cardsDealt <= 11) {
        nextRound = 4;  // After round 3 (11 cards), next is round 4
      } else if (this.cardsDealt <= 14) {
        nextRound = 5;  // After round 4 (14 cards), next is round 5
      } else if (this.cardsDealt <= 17) {
        nextRound = 0;  // After round 5 (17 cards), done
      } else {
        return 0; // Done
      }
      
      switch (nextRound) {
        case 2: return 3;  // Round 2 needs 3 cards
        case 3: return 3;  // Round 3 needs 3 cards
        case 4: return 3;  // Round 4 needs 3 cards
        case 5: return 3;  // Round 5 needs 3 cards
        default: return 0; // Done
      }
    }
  }
  
  /**
   * Get phase type for timer
   */
  getPhaseType() {
    if (this.inFantasyland) {
      return 'fantasyland';
    } else if (this.getCurrentRound() === 1) {
      return 'initial-set';
    } else {
      return 'round';
    }
  }
  
  /**
   * Get timer duration for current phase
   */
  getTimerDuration() {
    if (this.inFantasyland) {
      return 50000; // 50 seconds for fantasyland
    } else {
      return 20000; // 20 seconds for normal rounds
    }
  }
  
  /**
   * Create a public view of player state (for client)
   */
  toPublicView() {
    return {
      userId: this.id,
      name: this.name,
      placed: {
        top: this.board.top.length,
        middle: this.board.middle.length,
        bottom: this.board.bottom.length
      },
      score: this.score,
      ready: this.ready,
      inFantasyland: this.inFantasyland,
      roundComplete: this.roundComplete,
      tableChips: this.tableChips
    };
  }
  
  /**
   * Create full client state for this player (includes board and hand)
   */
  toClientState() {
    return {
      userId: this.id,
      name: this.name,
      board: {
        top: [...this.board.top],
        middle: [...this.board.middle],
        bottom: [...this.board.bottom]
      },
      hand: [...this.hand],
      discards: [...this.discards],
      score: this.score,
      ready: this.ready,
      inFantasyland: this.inFantasyland,
      roundComplete: this.roundComplete,
      tableChips: this.tableChips,
      currentDeal: [...this.currentDeal]
    };
  }
}
