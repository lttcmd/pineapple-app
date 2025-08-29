// src/game/chipManager.js
// Centralized chip management for OFC Pineapple tournament

import { settlePairwiseDetailed } from './scoring.js';
import { CHIP_CONSTANTS } from './constants.js';

// Re-export constants for backward compatibility
export { CHIP_CONSTANTS };

/**
 * Calculate chip changes for all players based on their boards
 * @param {Map} players - Map of playerId -> PlayerState
 * @returns {Object} - { results: {playerId: points}, chipChanges: {playerId: chipChange}, totalChips: number }
 */
export function calculateChipChanges(players) {
  const results = {};
  const playerIds = Array.from(players.keys());
  
  console.log(`💰 CHIP MANAGER: Calculating chip changes for ${playerIds.length} players`);
  
  // Calculate scoring for all pairwise combinations
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const playerAId = playerIds[i];
      const playerBId = playerIds[j];
      const playerA = players.get(playerAId);
      const playerB = players.get(playerBId);
      
      if (playerA && playerB) {
        console.log(`💰 CHIP MANAGER: Comparing ${playerA.name} vs ${playerB.name}`);
        
        const detailedResult = settlePairwiseDetailed(playerA.board, playerB.board);
        
        // Calculate total points for each player
        const aTotal = detailedResult.a.total;
        const bTotal = detailedResult.b.total;
        
        // Update results
        results[playerAId] = (results[playerAId] || 0) + aTotal;
        results[playerBId] = (results[playerBId] || 0) + bTotal;
        
        console.log(`💰 CHIP MANAGER: ${playerA.name} gets ${aTotal} points, running total: ${results[playerAId]}`);
        console.log(`💰 CHIP MANAGER: ${playerB.name} gets ${bTotal} points, running total: ${results[playerBId]}`);
      }
    }
  }
  
  // Calculate chip changes based on point differences between players
  const chipChanges = {};
  
  // For 2-player games, calculate the difference and transfer chips
  if (playerIds.length === 2) {
    const playerAId = playerIds[0];
    const playerBId = playerIds[1];
    const playerA = players.get(playerAId);
    const playerB = players.get(playerBId);
    
    const playerAPoints = results[playerAId] || 0;
    const playerBPoints = results[playerBId] || 0;
    const pointDifference = playerAPoints - playerBPoints;
    const chipDifference = pointDifference * CHIP_CONSTANTS.POINTS_PER_CHIP;
    
    console.log(`💰 CHIP MANAGER: ${playerA.name} (${playerAPoints} points) vs ${playerB.name} (${playerBPoints} points)`);
    console.log(`💰 CHIP MANAGER: Point difference: ${pointDifference}, Chip difference: ${chipDifference}`);
    
    if (pointDifference > 0) {
      // Player A wins
      const maxTransfer = Math.min(chipDifference, playerB.tableChips); // Can't win more than opponent has
      chipChanges[playerAId] = +maxTransfer;
      chipChanges[playerBId] = -maxTransfer;
      console.log(`💰 CHIP MANAGER: ${playerA.name} wins ${maxTransfer} chips (capped at opponent's ${playerB.tableChips} chips), ${playerB.name} loses ${maxTransfer} chips`);
    } else if (pointDifference < 0) {
      // Player B wins
      const maxTransfer = Math.min(-chipDifference, playerA.tableChips); // Can't win more than opponent has
      chipChanges[playerAId] = -maxTransfer; // This will be negative
      chipChanges[playerBId] = +maxTransfer; // This will be positive
      console.log(`💰 CHIP MANAGER: ${playerB.name} wins ${maxTransfer} chips (capped at opponent's ${playerA.tableChips} chips), ${playerA.name} loses ${maxTransfer} chips`);
    } else {
      // Tie - no chip changes
      chipChanges[playerAId] = 0;
      chipChanges[playerBId] = 0;
      console.log(`💰 CHIP MANAGER: Tie - no chip changes`);
    }
  } else {
    // For multi-player games, use the original logic (though this might need adjustment)
    console.log(`💰 CHIP MANAGER: Multi-player game detected - using original logic`);
    for (const [playerId, points] of Object.entries(results)) {
      const chipChange = points * CHIP_CONSTANTS.POINTS_PER_CHIP;
      chipChanges[playerId] = chipChange;
      
      const player = players.get(playerId);
      console.log(`💰 CHIP MANAGER: ${player.name} - Points: ${points}, Chip change: ${chipChange > 0 ? '+' : ''}${chipChange}`);
    }
  }
  
  // Calculate total chips after changes
  let totalChips = 0;
  for (const [playerId, player] of players) {
    const chipChange = chipChanges[playerId] || 0;
    const newChips = player.tableChips + chipChange;
    totalChips += newChips;
    
    console.log(`💰 CHIP MANAGER: ${player.name} - Old chips: ${player.tableChips}, Change: ${chipChange > 0 ? '+' : ''}${chipChange}, New chips: ${newChips}`);
  }
  
  console.log(`💰 CHIP MANAGER: Total chips on table: ${totalChips}/${CHIP_CONSTANTS.TOTAL_TABLE_CHIPS}`);
  
  if (totalChips !== CHIP_CONSTANTS.TOTAL_TABLE_CHIPS) {
    console.log(`⚠️  WARNING: Total chips (${totalChips}) doesn't equal ${CHIP_CONSTANTS.TOTAL_TABLE_CHIPS}!`);
  }
  
  return {
    results,
    chipChanges,
    totalChips
  };
}

/**
 * Apply chip changes to all players
 * @param {Map} players - Map of playerId -> PlayerState
 * @param {Object} chipChanges - {playerId: chipChange}
 */
export function applyChipChanges(players, chipChanges) {
  console.log(`💰 CHIP MANAGER: Applying chip changes to players`);
  
  for (const [playerId, chipChange] of Object.entries(chipChanges)) {
    const player = players.get(playerId);
    if (player) {
      const oldChips = player.tableChips;
      player.tableChips += chipChange;
      
      console.log(`💰 CHIP MANAGER: ${player.name} - ${oldChips} → ${player.tableChips} (${chipChange > 0 ? '+' : ''}${chipChange})`);
    }
  }
}

/**
 * Check for game end conditions
 * @param {Map} players - Map of playerId -> PlayerState
 * @returns {Object|null} - { winner: PlayerState, loser: PlayerState } or null if game continues
 */
export function checkGameEndConditions(players) {
  const winner = Array.from(players.values()).find(p => p.tableChips >= CHIP_CONSTANTS.WIN_THRESHOLD);
  const loser = Array.from(players.values()).find(p => p.tableChips <= CHIP_CONSTANTS.LOSE_THRESHOLD);
  
  if (winner || loser) {
    console.log(`💰 CHIP MANAGER: Game end detected! Winner: ${winner?.name || 'None'}, Loser: ${loser?.name || 'None'}`);
    return { winner, loser };
  }
  
  return null;
}

/**
 * Get chip information for a specific player
 * @param {PlayerState} player - Player state
 * @returns {Object} - { currentChips, startingChips, chipChange }
 */
export function getPlayerChipInfo(player) {
  return {
    currentChips: player.tableChips,
    startingChips: CHIP_CONSTANTS.STARTING_CHIPS,
    chipChange: player.tableChips - CHIP_CONSTANTS.STARTING_CHIPS
  };
}

/**
 * Calculate chip difference between two players for UI display
 * @param {number} playerScore - Player's total points
 * @param {number} opponentScore - Opponent's total points
 * @returns {number} - Chip difference (positive = player wins, negative = opponent wins)
 */
export function calculateChipDifference(playerScore, opponentScore) {
  const pointDifference = playerScore - opponentScore;
  return pointDifference * CHIP_CONSTANTS.POINTS_PER_CHIP;
}

/**
 * Validate chip totals
 * @param {Map} players - Map of playerId -> PlayerState
 * @returns {boolean} - True if totals are valid
 */
export function validateChipTotals(players) {
  const totalChips = Array.from(players.values()).reduce((sum, p) => sum + p.tableChips, 0);
  const isValid = totalChips === CHIP_CONSTANTS.TOTAL_TABLE_CHIPS;
  
  if (!isValid) {
    console.log(`❌ CHIP VALIDATION FAILED: Total chips (${totalChips}) doesn't equal ${CHIP_CONSTANTS.TOTAL_TABLE_CHIPS}`);
  }
  
  return isValid;
}
