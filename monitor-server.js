// monitor-server.js - Live server monitoring
import fetch from 'node-fetch';

console.log("🎮 OFC Pineapple Server Monitor");
console.log("Press Ctrl+C to exit\n");

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${seconds}.${tenths}s`;
}

function displayRoom(roomId, room) {
  const timerStatus = room.timer.isActive ? 
    `⏰ ${formatTime(room.timer.timeLeft)}` : 
    "⏸️  Stopped";
  
  console.log(`\n🎮 Room: ${roomId}`);
  console.log(`📊 Phase: ${room.phase} | Round: ${room.round} | ${timerStatus}`);
  
  for (const [userId, player] of Object.entries(room.players)) {
    const readyStatus = player.ready ? "✅" : "⏳";
    const boardState = `T${player.board.top.length}/M${player.board.middle.length}/B${player.board.bottom.length}`;
    console.log(`  ${readyStatus} ${player.name}: Score ${player.score || 0} | Board ${boardState} | Hand ${player.hand.length}`);
  }
}

async function monitor() {
  try {
    const response = await fetch('http://localhost:3000/monitor');
    const data = await response.json();
    
    console.clear();
    console.log("🎮 OFC Pineapple Server Monitor");
    console.log(`📅 ${new Date().toLocaleTimeString()}`);
    console.log(`🏠 Active Rooms: ${data.activeRooms}\n`);
    
    if (data.activeRooms === 0) {
      console.log("No active rooms");
      return;
    }
    
    for (const [roomId, room] of Object.entries(data.rooms)) {
      displayRoom(roomId, room);
    }
  } catch (error) {
    console.clear();
    console.log("🎮 OFC Pineapple Server Monitor");
    console.log(`❌ Error connecting to server: ${error.message}`);
    console.log("Make sure the server is running on http://localhost:3000");
  }
}

// Update every second
setInterval(monitor, 1000);
monitor(); // Initial display
