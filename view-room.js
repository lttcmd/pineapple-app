// view-room.js - Command line tool to inspect room state
import fetch from 'node-fetch';

const roomId = process.argv[2];

if (!roomId) {
  console.log("Usage: node view-room.js <roomId>");
  console.log("Example: node view-room.js ABC123");
  process.exit(1);
}

async function viewRoom() {
  try {
    const response = await fetch('http://localhost:3000/monitor');
    const data = await response.json();
    
    const room = data.rooms[roomId];
    
    if (!room) {
      console.log(`❌ Room ${roomId} not found`);
      console.log("Available rooms:", Object.keys(data.rooms));
      process.exit(1);
    }

console.log(`\n🎮 ROOM: ${roomId}`);
console.log(`📊 Phase: ${room.phase}`);
console.log(`🔄 Round: ${room.round}`);
console.log(`📈 Round Index: ${room.roundIndex}`);
console.log(`⏰ Timer Active: ${room.timer.isActive}`);
console.log(`⏱️  Time Left: ${room.timer.timeLeft}ms`);

console.log(`\n👥 PLAYERS (${Object.keys(room.players).length}):`);
for (const [userId, player] of Object.entries(room.players)) {
  console.log(`  ${player.name} (${userId.slice(-4)})`);
  console.log(`    Score: ${player.score || 0}`);
  console.log(`    Ready: ${player.ready}`);
  console.log(`    Hand: ${player.hand.length} cards [${player.hand.join(', ')}]`);
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
  } catch (error) {
    console.log(`❌ Error connecting to server: ${error.message}`);
    console.log("Make sure the server is running on http://localhost:3000");
  }
}

viewRoom();
