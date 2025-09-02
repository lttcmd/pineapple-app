// src/game/stats.js
// Calculate player stats from game results

import { updatePlayerStats } from "../store/database.js";

/**
 * Calculate and update player stats from a completed hand
 * @param {Object} revealData - The reveal data from round:reveal event
 * @param {Object} playerMap - Map of userId to databaseId
 */
export async function updateStatsFromReveal(revealData, playerMap) {
  if (!revealData || !revealData.pairwise || !playerMap) {
    console.log('Invalid data for stats update:', revealData, playerMap);
    return;
  }

  console.log('🎯 Updating stats from reveal data:', revealData.handNumber);

  // Track stats for each player
  const playerStats = new Map();

  // Initialize stats for all players
  for (const [userId, dbId] of playerMap) {
    playerStats.set(userId, {
      handsPlayed: 1, // Each player played one hand
      royaltiesTotal: 0,
      fantasyEntrances: 0,
      fouls: 0,
      handsWon: 0 // Will be updated based on results
    });
  }

  // Process each pairwise result
  for (const pair of revealData.pairwise) {
    const playerA = pair.a;
    const playerB = pair.b;
    
    // Check for fouls
    if (playerA.foul) {
      const stats = playerStats.get(pair.aUserId);
      if (stats) stats.fouls = 1;
    }
    if (playerB.foul) {
      const stats = playerStats.get(pair.bUserId);
      if (stats) stats.fouls = 1;
    }

    // Calculate royalties for each player
    const aRoyalties = calculateRoyalties(playerA);
    const bRoyalties = calculateRoyalties(playerB);

    // Add royalties to player stats
    const aStats = playerStats.get(pair.aUserId);
    const bStats = playerStats.get(pair.bUserId);
    
    if (aStats) aStats.royaltiesTotal += aRoyalties;
    if (bStats) bStats.royaltiesTotal += bRoyalties;
    
    // Determine who won the hand (even by 1 point)
    const aTotal = (playerA.lines?.top || 0) + (playerA.lines?.middle || 0) + (playerA.lines?.bottom || 0) + aRoyalties;
    const bTotal = (playerB.lines?.top || 0) + (playerB.lines?.middle || 0) + (playerB.lines?.bottom || 0) + bRoyalties;
    
    // Award hand win to the player with higher total (even if just 1 point difference)
    if (aTotal > bTotal) {
      if (aStats) aStats.handsWon = 1;
    } else if (bTotal > aTotal) {
      if (bStats) bStats.handsWon = 1;
    }
    // If tied, no one gets a hand win
  }

  // Check for Fantasy Land entries
  if (revealData.fantasyland) {
    for (const userId of revealData.fantasyland) {
      const stats = playerStats.get(userId);
      if (stats) stats.fantasyEntrances = 1;
    }
  }

  // Update database for each player
  for (const [userId, stats] of playerStats) {
    const dbId = playerMap.get(userId);
    if (dbId) {
      try {
        await updatePlayerStats(dbId, stats);
        console.log(`✅ Updated stats for user ${userId}:`, stats);
      } catch (error) {
        console.error(`❌ Failed to update stats for user ${userId}:`, error);
      }
    }
  }
}

/**
 * Calculate total royalties from detailed scoring data
 * @param {Object} playerData - Player's detailed scoring data
 * @returns {number} Total royalties earned
 */
function calculateRoyalties(playerData) {
  if (!playerData || !playerData.royaltiesBreakdown) {
    return 0;
  }

  const { royaltiesBreakdown } = playerData;
  return (royaltiesBreakdown.top || 0) + 
         (royaltiesBreakdown.middle || 0) + 
         (royaltiesBreakdown.bottom || 0);
}
