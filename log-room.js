import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get room ID from command line argument
const roomId = process.argv[2];
if (!roomId) {
  console.log('Usage: node log-room.js <roomId>');
  process.exit(1);
}

// Create logs directory if it doesn't exist
const logsDir = join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create log file with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = join(logsDir, `room-${roomId}-${timestamp}.log`);

console.log(`🎬 Starting room logger for room ${roomId}`);
console.log(`📝 Log file: ${logFile}`);

// Function to write to log file
function writeLog(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, logEntry);
  console.log(message);
}

// Function to get room data
async function getRoomData() {
  try {
    const response = await fetch(`http://localhost:3000/monitor`);
    const data = await response.json();
    return data.rooms[roomId]; // rooms is an object, not an array
  } catch (error) {
    writeLog(`❌ Error fetching room data: ${error.message}`);
    return null;
  }
}

// Function to format room data for logging
function formatRoomData(room) {
  if (!room) {
    return '❌ Room not found or no data available';
  }

  let output = `\n🎮 ROOM LOG - ${room.id}\n`;
  output += `⏰ Timestamp: ${new Date().toISOString()}\n`;
  output += `📊 Phase: ${room.phase}\n`;
  output += `🔄 Hand #: ${room.round}\n`;
  output += `📈 Round Index: ${room.roundIndex}\n`;
  output += `🎯 Current Round: ${room.currentRound}\n`;
  output += `🏆 Ranked Match: ${room.isRanked ? 'YES' : 'NO'}\n`;
  output += `⏰ Timer Active: ${room.timerActive || false}\n`;
  output += `⏱️  Time Left: ${room.timeLeft || 0}ms\n`;
  output += `🎴 Seed: ${room.seed || 'N/A'}\n\n`;

  // Deck information
  if (room.sharedDeck) {
    output += `🃏 REMAINING CARDS IN DECK (${room.sharedDeck.length} cards):\n`;
    output += `   [${room.sharedDeck.join(', ')}]\n\n`;
  }

  // Hand cards information
  if (room.handCards && room.handCards.length > 0) {
    output += `🎯 HAND CARDS (${room.handCards.length} cards):\n`;
    room.handCards.forEach((card, index) => {
      output += `   card_${index + 1}: ${card}\n`;
    });
    output += '\n';
  }

  // Players information
  const playerArray = Object.values(room.players);
  output += `👥 PLAYERS (${playerArray.length}):\n`;
  playerArray.forEach(player => {
    output += `  ${player.name} (${player.userId})\n`;
    output += `    Score: ${player.score || 0}\n`;
    if (room.isRanked) {
      output += `    💰 Table Chips: ${player.tableChips || 500}\n`;
    }
    output += `    Ready: ${player.ready}\n`;
    output += `    Round Complete: ${player.roundComplete}\n`;
    output += `    In Fantasyland: ${player.inFantasyland}\n`;
    output += `    Has Played Fantasyland Hand: ${player.hasPlayedFantasylandHand}\n`;
    output += `    Hand Card Index: ${player.handCardIndex}\n`;
    output += `    Hand: ${player.hand.length} cards [${player.hand.join(', ')}]\n`;
    
    if (player.handCardIndex > 0 && room.handCards) {
      const dealtCards = room.handCards.slice(0, player.handCardIndex);
      const remainingCards = room.handCards.slice(player.handCardIndex);
      output += `    Cards Dealt from Hand: [${dealtCards.join(', ')}]\n`;
      output += `    Cards To Come: [${remainingCards.join(', ')}]\n`;
    }
    
    output += `    Board: T${player.board.top.length}/M${player.board.middle.length}/B${player.board.bottom.length}\n`;
    output += `      Top: [${player.board.top.join(', ')}]\n`;
    output += `      Middle: [${player.board.middle.join(', ')}]\n`;
    output += `      Bottom: [${player.board.bottom.join(', ')}]\n`;
    output += `    Discards: [${player.discards.join(', ')}]\n`;
    output += `    Current Deal: [${player.currentDeal.join(', ')}]\n\n`;
  });

  // Game status
  if (room.handComplete) {
    output += `🎲 Hand complete - waiting for next round\n`;
  } else {
    output += `🎲 Game in progress\n`;
  }

  // Ranked match info
  if (room.isRanked) {
    output += `\n🏆 RANKED MATCH INFO:\n`;
    output += `   💰 Total chips on table: 1000\n`;
    output += `   🎯 Match ends when one player has all 1000 chips\n`;
    output += `   📊 1 point = 10 chips conversion\n`;
    
    const totalChips = Object.values(room.players).reduce((sum, p) => sum + (p.tableChips || 500), 0);
    output += `   💰 Current chip distribution: ${totalChips}/1000\n`;
    
    // Check for potential match end
    const playersArr = Object.values(room.players);
    const winner = playersArr.find(p => p.tableChips >= 1000);
    const loser = playersArr.find(p => p.tableChips <= 0);
    if (winner && loser) {
      output += `   🏁 MATCH END DETECTED: ${winner.name} wins, ${loser.name} loses\n`;
    }
  }

  // Mixed mode detection
  const hasFantasylandPlayers = Object.values(room.players).some(player => player.inFantasyland);
  const hasNormalPlayers = Object.values(room.players).some(player => !player.inFantasyland);
  const isMixedMode = hasFantasylandPlayers && hasNormalPlayers;
  
  if (isMixedMode) {
    output += `\n🔄 MIXED MODE DETECTED:\n`;
    const normalPlayer = Object.values(room.players).find(p => !p.inFantasyland);
    const fantasylandPlayer = Object.values(room.players).find(p => p.inFantasyland);
    
    if (normalPlayer) {
      const normalPlayerRound = normalPlayer.handCardIndex === 17 ? 5 : 
        normalPlayer.handCardIndex === 14 ? 4 :
        normalPlayer.handCardIndex === 11 ? 3 :
        normalPlayer.handCardIndex === 8 ? 2 :
        normalPlayer.handCardIndex === 5 ? 1 : 0;
      output += `   👤 Normal Player (${normalPlayer.name}): Round ${normalPlayerRound}, handCardIndex: ${normalPlayer.handCardIndex}\n`;
    }
    
    if (fantasylandPlayer) {
      output += `   🌈 Fantasyland Player (${fantasylandPlayer.name}): Ready: ${fantasylandPlayer.ready}\n`;
    }
  }

  // Phase-specific debugging
  if (room.phase === 'reveal') {
    output += `\n🔍 REVEAL PHASE DEBUG:\n`;
    output += `   📊 Room currentRound: ${room.currentRound}\n`;
    output += `   🎯 Expected currentRound for completed hand: 5\n`;
    if (room.currentRound !== 5) {
      output += `   ⚠️  WARNING: currentRound should be 5 in reveal phase!\n`;
    }
    
    // Detailed scoring breakdown for reveal phase
    output += `\n📊 DETAILED SCORING BREAKDOWN:\n`;
    const playersArr = Object.values(room.players);
    if (playersArr.length === 2) {
      const [playerA, playerB] = playersArr;
      
      // Calculate expected scoring
      output += `\n👤 ${playerA.name} (Player A):\n`;
      output += `   Board: T[${playerA.board.top.join(', ')}] M[${playerA.board.middle.join(', ')}] B[${playerA.board.bottom.join(', ')}]\n`;
      output += `   Score: ${playerA.score || 0}\n`;
      if (room.isRanked) {
        output += `   💰 Table Chips: ${playerA.tableChips || 500}\n`;
      }
      
      output += `\n👤 ${playerB.name} (Player B):\n`;
      output += `   Board: T[${playerB.board.top.join(', ')}] M[${playerB.board.middle.join(', ')}] B[${playerB.board.bottom.join(', ')}]\n`;
      output += `   Score: ${playerB.score || 0}\n`;
      if (room.isRanked) {
        output += `   💰 Table Chips: ${playerB.tableChips || 500}\n`;
      }
      
      // Check for fouls
      const aFouled = playerA.board.top.length !== 3 || playerA.board.middle.length !== 5 || playerA.board.bottom.length !== 5;
      const bFouled = playerB.board.top.length !== 3 || playerB.board.middle.length !== 5 || playerB.board.bottom.length !== 5;
      
      output += `\n🚨 FOUL DETECTION:\n`;
      output += `   ${playerA.name} fouled: ${aFouled ? 'YES' : 'NO'}\n`;
      output += `   ${playerB.name} fouled: ${bFouled ? 'YES' : 'NO'}\n`;
      
      if (aFouled || bFouled) {
        output += `\n🎯 FOUL SCORING EXPECTED:\n`;
        if (aFouled && !bFouled) {
          output += `   ${playerB.name} should get:\n`;
          output += `     +6 (foul penalty) + 3 (scoop bonus) + royalties\n`;
          output += `     +1 for each row win (all 3 rows)\n`;
        } else if (!aFouled && bFouled) {
          output += `   ${playerA.name} should get:\n`;
          output += `     +6 (foul penalty) + 3 (scoop bonus) + royalties\n`;
          output += `     +1 for each row win (all 3 rows)\n`;
        } else if (aFouled && bFouled) {
          output += `   Both fouled - no scoring\n`;
        }
      }
      
      // Calculate expected royalties
      output += `\n👑 ROYALTIES ANALYSIS:\n`;
      // This would require importing the scoring functions, but for now we'll note the cards
      output += `   ${playerA.name} top: [${playerA.board.top.join(', ')}] - check for pairs/trips\n`;
      output += `   ${playerA.name} middle: [${playerA.board.middle.join(', ')}] - check for trips/straight/flush/full house/quads\n`;
      output += `   ${playerA.name} bottom: [${playerA.board.bottom.join(', ')}] - check for straight/flush/full house/quads\n`;
      output += `   ${playerB.name} top: [${playerB.board.top.join(', ')}] - check for pairs/trips\n`;
      output += `   ${playerB.name} middle: [${playerB.board.middle.join(', ')}] - check for trips/straight/flush/full house/quads\n`;
      output += `   ${playerB.name} bottom: [${playerB.board.bottom.join(', ')}] - check for straight/flush/full house/quads\n`;
      
      // Point difference and chip conversion
      const scoreDiff = (playerA.score || 0) - (playerB.score || 0);
      const chipDiff = Math.abs(scoreDiff) * 10;
      output += `\n💰 POINT/CHIP CONVERSION:\n`;
      output += `   Point difference: ${scoreDiff} (${playerA.name} ${scoreDiff > 0 ? '+' : ''}${scoreDiff})\n`;
      output += `   Chip exchange: ${chipDiff} chips (${scoreDiff > 0 ? playerA.name : playerB.name} gets ${chipDiff})\n`;
      
      if (room.isRanked) {
        const expectedChipsA = 500 + (scoreDiff * 10);
        const expectedChipsB = 500 - (scoreDiff * 10);
        output += `   Expected ${playerA.name} chips: ${expectedChipsA}\n`;
        output += `   Expected ${playerB.name} chips: ${expectedChipsB}\n`;
        output += `   Actual ${playerA.name} chips: ${playerA.tableChips || 500}\n`;
        output += `   Actual ${playerB.name} chips: ${playerB.tableChips || 500}\n`;
      }
    }
  }

  // Next round ready state
  if (room.nextRoundReady && room.nextRoundReady.size > 0) {
    output += `\n⏭️  NEXT ROUND READY:\n`;
    output += `   Players ready: [${Array.from(room.nextRoundReady).join(', ')}]\n`;
  }

  output += `\n${'='.repeat(80)}\n`;
  return output;
}

// Function to monitor room activity
async function monitorRoom() {
  writeLog(`🚀 Starting room monitoring for room ${roomId}`);
  
  let lastData = null;
  let activityCount = 0;
  
  const interval = setInterval(async () => {
    try {
      const room = await getRoomData();
      
      if (!room) {
        writeLog(`⚠️  Room ${roomId} not found or no data available`);
        return;
      }

      // Check if there's been any change
      const currentData = JSON.stringify(room);
      if (currentData !== lastData) {
        activityCount++;
        writeLog(`📊 Activity #${activityCount} detected`);
        writeLog(formatRoomData(room));
        lastData = currentData;
      }
      
    } catch (error) {
      writeLog(`❌ Error in monitoring: ${error.message}`);
    }
  }, 2000); // Check every 2 seconds

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    writeLog(`\n🛑 Room monitoring stopped for room ${roomId}`);
    writeLog(`📊 Total activities logged: ${activityCount}`);
    writeLog(`📁 Log saved to: ${logFile}`);
    clearInterval(interval);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    writeLog(`\n🛑 Room monitoring stopped for room ${roomId}`);
    writeLog(`📊 Total activities logged: ${activityCount}`);
    writeLog(`📁 Log saved to: ${logFile}`);
    clearInterval(interval);
    process.exit(0);
  });
}

// Start monitoring
monitorRoom().catch(error => {
  writeLog(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
