/**
 * AutoPlacement - Clean auto-placement logic
 * Handles deterministic card placement when timers expire
 */

export class AutoPlacement {
  /**
   * Auto-place cards for a player based on their current phase
   */
  static autoPlaceCards(player, phaseType) {
    console.log(`🎯 AUTO-PLACE: Starting auto-placement for ${player.name}, phase: ${phaseType}`);
    
    const emptySlots = this.scanEmptySlots(player.board);
    console.log(`🎯 AUTO-PLACE: Found ${emptySlots.length} empty slots`);
    
    let cardsToPlace = [];
    let discard = null;
    
    // Determine cards to place based on phase type
    switch (phaseType) {
      case 'initial-set':
        // Round 1: Place all 5 cards, no discard
        cardsToPlace = player.hand.slice(0, 5);
        discard = null;
        break;
        
      case 'round':
        // Normal rounds: Place 2 cards, discard 1
        cardsToPlace = player.hand.slice(0, 2);
        discard = player.hand[2] || null;
        break;
        
      case 'fantasyland':
        // Fantasyland: Place all cards except 1 for discard
        if (player.hand.length > 1) {
          cardsToPlace = player.hand.slice(0, player.hand.length - 1);
          discard = player.hand[player.hand.length - 1];
        } else {
          cardsToPlace = [];
          discard = player.hand[0] || null;
        }
        break;
        
      default:
        throw new Error(`Unknown phase type for auto-placement: ${phaseType}`);
    }
    
    console.log(`🎯 AUTO-PLACE: Cards to place: ${cardsToPlace.length}, discard: ${discard}`);
    
    // Place cards in empty slots
    const placements = [];
    for (let i = 0; i < cardsToPlace.length && i < emptySlots.length; i++) {
      const card = cardsToPlace[i];
      const slot = emptySlots[i];
      
      placements.push({
        row: slot.row,
        card: card
      });
    }
    
    console.log(`🎯 AUTO-PLACE: Generated ${placements.length} placements for ${player.name}`);
    
    return {
      placements: placements,
      discard: discard,
      cardsPlaced: placements.length,
      cardsDiscarded: discard ? 1 : 0
    };
  }
  
  /**
   * Scan empty slots in deterministic order
   * Order: Top → Middle → Bottom, Left → Right
   */
  static scanEmptySlots(board) {
    const emptySlots = [];
    
    // Define row order and limits
    const rows = [
      { name: 'top', maxCards: 3 },
      { name: 'middle', maxCards: 5 },
      { name: 'bottom', maxCards: 5 }
    ];
    
    // Scan each row in order
    for (const row of rows) {
      for (let i = 0; i < row.maxCards; i++) {
        if (board[row.name].length <= i) {
          emptySlots.push({
            row: row.name,
            index: i
          });
        }
      }
    }
    
    return emptySlots;
  }
  
  /**
   * Apply auto-placement to a player
   */
  static applyAutoPlacement(player, autoPlacementResult) {
    console.log(`🎯 AUTO-PLACE: Applying auto-placement to ${player.name}`);
    
    // Place cards on board
    for (const placement of autoPlacementResult.placements) {
      player.board[placement.row].push(placement.card);
    }
    
    // Remove placed cards from hand
    for (const placement of autoPlacementResult.placements) {
      const cardIndex = player.hand.indexOf(placement.card);
      if (cardIndex !== -1) {
        player.hand.splice(cardIndex, 1);
      }
    }
    
    // Handle discard
    if (autoPlacementResult.discard) {
      player.discards.push(autoPlacementResult.discard);
      const discardIndex = player.hand.indexOf(autoPlacementResult.discard);
      if (discardIndex !== -1) {
        player.hand.splice(discardIndex, 1);
      }
    }
    
    // Mark player as ready
    player.markReady();
    
    console.log(`🎯 AUTO-PLACE: Completed auto-placement for ${player.name}`);
    console.log(`🎯 AUTO-PLACE: Board: Top(${player.board.top.length}), Middle(${player.board.middle.length}), Bottom(${player.board.bottom.length})`);
    console.log(`🎯 AUTO-PLACE: Hand: ${player.hand.length} cards, Discards: ${player.discards.length} cards`);
    
    return autoPlacementResult;
  }
  
  /**
   * Get auto-placement info for client notification
   */
  static getClientNotification(autoPlacementResult) {
    return {
      placements: autoPlacementResult.placements,
      discard: autoPlacementResult.discard,
      autoCommitted: true,
      cardsPlaced: autoPlacementResult.cardsPlaced,
      cardsDiscarded: autoPlacementResult.cardsDiscarded
    };
  }
}
