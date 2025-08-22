// view-room.js - Live command line tool to inspect room state
import fetch from 'node-fetch';

const roomId = process.argv[2];
const refreshInterval = 2000; // 2 seconds

if (!roomId) {
  console.log("Usage: node view-room.js <roomId>");
  console.log("Example: node view-room.js ABC123");
  console.log("Press Ctrl+C to stop the live viewer");
  process.exit(1);
}

let previousState = null;

function clearScreen() {
  // Clear the console (works on most terminals)
  console.clear();
  // Alternative for Windows
  process.stdout.write('\x1Bc');
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

function detectChanges(currentState, previousState) {
  if (!previousState) return null;
  
  const changes = [];
  
  // Check for ready state changes
  for (const [userId, currentPlayer] of Object.entries(currentState.players)) {
    const previousPlayer = previousState.players[userId];
    if (previousPlayer && currentPlayer.ready !== previousPlayer.ready) {
      changes.push(`🔄 ${currentPlayer.name}: Ready ${previousPlayer.ready} → ${currentPlayer.ready}`);
    }
    if (previousPlayer && currentPlayer.handCardIndex !== previousPlayer.handCardIndex) {
      changes.push(`🎴 ${currentPlayer.name}: Cards ${previousPlayer.handCardIndex} → ${currentPlayer.handCardIndex}`);
    }
  }
  
  // Check for phase changes
  if (currentState.phase !== previousState.phase) {
    changes.push(`📊 Phase: ${previousState.phase} → ${currentState.phase}`);
  }
  
  return changes;
}

async function viewRoom() {
  try {
    const response = await fetch('http://localhost:3000/monitor');
    const data = await response.json();
    
    const room = data.rooms[roomId];
    
    if (!room) {
      console.log(`❌ Room ${roomId} not found`);
      console.log("Available rooms:", Object.keys(data.rooms));
      return;
    }

    // Detect changes
    const changes = detectChanges(room, previousState);
    
    // Clear screen for live updates
    clearScreen();
    
    console.log(`🎮 LIVE VIEWER - ROOM: ${roomId}`);
    console.log(`⏰ Last Updated: ${formatTimestamp(data.timestamp)}`);
    
    // Show recent changes
    if (changes && changes.length > 0) {
      console.log(`\n📈 RECENT CHANGES:`);
      changes.forEach(change => console.log(`   ${change}`));
    }
    console.log(`📊 Phase: ${room.phase}`);
    console.log(`🔄 Round: ${room.round}`);
    console.log(`📈 Round Index: ${room.roundIndex}`);
    console.log(`⏰ Timer Active: ${room.timer.isActive}`);
    console.log(`⏱️  Time Left: ${room.timer.timeLeft}ms`);

    // Display deck information if available
    if (room.seed) {
      console.log(`🎴 Seed: ${room.seed}`);
    }

    if (room.sharedDeck && room.sharedDeck.length > 0) {
      console.log(`\n🃏 REMAINING CARDS IN DECK (${room.sharedDeck.length} cards):`);
      console.log(`   [${room.sharedDeck.join(', ')}]`);
    }

    if (room.handCards && room.handCards.length > 0) {
      console.log(`\n🎯 HAND CARDS (${room.handCards.length} cards):`);
      room.handCards.forEach((card, index) => {
        console.log(`   card_${index + 1}: ${card}`);
      });
    }

    console.log(`\n👥 PLAYERS (${Object.keys(room.players).length}):`);
    for (const [userId, player] of Object.entries(room.players)) {
      console.log(`  ${player.name} (${userId.slice(-4)})`);
      console.log(`    Score: ${player.score || 0}`);
      console.log(`    Ready: ${player.ready}`);
      console.log(`    In Fantasyland: ${player.inFantasyland || false}`);
      console.log(`    Has Played Fantasyland Hand: ${player.hasPlayedFantasylandHand || false}`);
      console.log(`    Hand Card Index: ${player.handCardIndex || 0}`);
      console.log(`    Hand: ${player.hand.length} cards [${player.hand.join(', ')}]`);
      
        // Show which cards from handCards are dealt to this player
  if (room.handCards && room.handCards.length > 0 && player.handCardIndex > 0) {
    console.log(`    Cards Dealt from Hand: [${room.handCards.slice(0, player.handCardIndex).join(', ')}]`);
    
    // Fantasyland players only get cards 1-14, so they never have "cards to come"
    if (player.inFantasyland) {
      console.log(`    Cards To Come: [] (Fantasyland - no more cards)`);
    } else {
      console.log(`    Cards To Come: [${room.handCards.slice(player.handCardIndex).join(', ')}]`);
    }
  }
      
      console.log(`    Board: T${player.board.top.length}/M${player.board.middle.length}/B${player.board.bottom.length}`);
      console.log(`      Top: [${player.board.top.join(', ')}]`);
      console.log(`      Middle: [${player.board.middle.join(', ')}]`);
      console.log(`      Bottom: [${player.board.bottom.join(', ')}]`);
      console.log(`    Discards: [${player.discards.join(', ')}]`);
      console.log(`    Current Deal: [${player.currentDeal.join(', ')}]`);
      console.log("");
    }

    if (room.phase === "reveal") {
      console.log("🎯 GAME COMPLETE - Scoring phase");
    } else if (room.phase === "lobby") {
      console.log("🏠 Waiting for players to start");
    } else {
      console.log("🎲 Game in progress");
    }

    // Show status
    console.log(`\n🔄 Auto-refreshing every ${refreshInterval/1000}s... Press Ctrl+C to stop`);
    
    // Store current state for next comparison
    previousState = room;
    
  } catch (error) {
    console.log(`❌ Error connecting to server: ${error.message}`);
    console.log("Make sure the server is running on http://localhost:3000");
  }
}

// Set up continuous monitoring
console.log(`🎮 Starting live viewer for room: ${roomId}`);
console.log(`⏰ Refreshing every ${refreshInterval/1000} seconds...`);
console.log(`🛑 Press Ctrl+C to stop\n`);

// Initial view
await viewRoom();

// Set up interval for continuous updates
const intervalId = setInterval(viewRoom, refreshInterval);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Live viewer stopped');
  clearInterval(intervalId);
  process.exit(0);
});
