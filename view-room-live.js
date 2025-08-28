import fetch from 'node-fetch';
import fs from 'fs';

console.log('🎮 Live Room Monitor Started...\n');
console.log('Enter a room ID to monitor (or press Enter to list all rooms):');

const SERVER_URL = 'http://localhost:3000';
const LOG_FILE = 'room-monitor.log';

// Initialize log file
const timestamp = new Date().toISOString();
fs.writeFileSync(LOG_FILE, `=== ROOM MONITOR LOG STARTED: ${timestamp} ===\n\n`);

// Log function that writes to both console and file
function logToBoth(message) {
  console.log(message);
  fs.appendFileSync(LOG_FILE, message + '\n');
}

// Clear console function
function clearConsole() {
  console.clear();
}

// Format cards for display
function formatCards(cards) {
  if (!cards || cards.length === 0) return 'empty';
  return cards.map(card => {
    if (typeof card === 'string') {
      return card; // Already formatted
    } else if (card && card.rank && card.suit) {
      return `${card.rank}${card.suit}`;
    } else {
      return '?'; // Unknown format
    }
  }).join(' ');
}

// Format board for display
function formatBoard(board) {
  const top = board.top && board.top.length > 0 ? formatCards(board.top) : 'empty';
  const middle = board.middle && board.middle.length > 0 ? formatCards(board.middle) : 'empty';
  const bottom = board.bottom && board.bottom.length > 0 ? formatCards(board.bottom) : 'empty';
  return { top, middle, bottom };
}

// Get timer info
function getTimerInfo(timer) {
  if (!timer || !timer.isActive) return { remaining: 0, active: false };
  const remaining = Math.max(0, Math.ceil((timer.deadlineEpochMs - Date.now()) / 1000));
  return { remaining, active: true };
}

// Fetch room data from server
async function fetchRoomData(roomId) {
  try {
    const response = await fetch(`${SERVER_URL}/monitor`);
    const data = await response.json();
    
    if (roomId) {
      // Find specific room
      const room = data.rooms[roomId];
      if (room) {
        // Convert players object to array and add userId
        room.players = Object.entries(room.players).map(([userId, player]) => ({
          ...player,
          userId: userId
        }));
        return room;
      }
      return null;
    } else {
      // Return all rooms as array
      const roomsArray = Object.entries(data.rooms || {}).map(([roomId, room]) => ({
        ...room,
        id: roomId,
        players: Object.entries(room.players).map(([userId, player]) => ({
          ...player,
          userId: userId
        }))
      }));
      return roomsArray;
    }
  } catch (error) {
    logToBoth(`❌ Error fetching room data: ${error.message}`);
    return null;
  }
}

// Display room state
async function displayRoomState(roomId) {
  const room = await fetchRoomData(roomId);
  if (!room) {
    logToBoth(`❌ Room ${roomId} not found`);
    return;
  }



  clearConsole();
  
  const timestamp = new Date().toISOString();
  logToBoth(`\n🎮 LIVE ROOM MONITOR - ${timestamp}\n`);
  logToBoth('='.repeat(80));
  logToBoth(`Room ID: ${room.id}`);
  logToBoth(`Phase: ${room.phase}`);
  logToBoth(`Round: ${room.round || 1}`);
  logToBoth(`Players: ${room.players.length}`);
  logToBoth('='.repeat(80));
  
  // Individual player timers for all games
  logToBoth(`Individual Player Timers (Fantasyland: 50s, Normal: 15s)`);
  
  logToBoth('\n' + '='.repeat(80));
  
  // Display each player
  room.players.forEach((player, index) => {
    const playerTimer = getTimerInfo(player.timer);
    const board = formatBoard(player.board);
    
    logToBoth(`Player ${index + 1}: ${player.name || player.userId}`);
    logToBoth(`  User ID: ${player.userId}`);
    logToBoth(`  Fantasyland: ${player.inFantasyland ? 'YES' : 'NO'}`);
    logToBoth(`  Ready: ${player.ready ? 'YES' : 'NO'}`);
    logToBoth(`  Round Complete: ${player.roundComplete ? 'YES' : 'NO'}`);
    logToBoth(`  Timer: ${playerTimer.active ? `${playerTimer.remaining}s` : 'INACTIVE'} (${player.timer?.phaseType || 'none'}) ${player.inFantasyland ? '(50s)' : '(15s)'}`);
    logToBoth(`  Cards in hand: ${formatCards(player.hand)}`);
    logToBoth(`  Cards in currentDeal: ${formatCards(player.currentDeal)}`);
    logToBoth(`  Discards: ${formatCards(player.discards)}`);
    logToBoth('  Board:');
    logToBoth(`    Top:    ${board.top}`);
    logToBoth(`    Middle: ${board.middle}`);
    logToBoth(`    Bottom: ${board.bottom}`);
    
    if (index < room.players.length - 1) {
      logToBoth('\n' + '-'.repeat(80) + '\n');
    }
  });
  
  logToBoth('\n' + '='.repeat(80));
  logToBoth(`Next Round Ready: ${room.nextRoundReady ? room.nextRoundReady.length : 0} players`);
  if (room.nextRoundReady && room.nextRoundReady.length > 0) {
    logToBoth(`Ready Players: ${room.nextRoundReady.join(', ')}`);
  }
  logToBoth('='.repeat(80));
  logToBoth('\nPress Ctrl+C to stop monitoring');
}

// List all rooms
async function listRooms() {
  const rooms = await fetchRoomData();
  
  clearConsole();
  logToBoth('🎮 Available Rooms:\n');
  logToBoth('='.repeat(60));
  
  if (!rooms || rooms.length === 0) {
    logToBoth('No active rooms found');
  } else {
    rooms.forEach(room => {
      const playerCount = room.players.length;
      const phase = room.phase || 'unknown';
      const round = room.round || 1;
      logToBoth(`Room ID: ${room.id}`);
      logToBoth(`  Players: ${playerCount}`);
      logToBoth(`  Phase: ${phase}`);
      logToBoth(`  Round: ${round}`);
      logToBoth('');
    });
  }
  
  logToBoth('='.repeat(60));
  logToBoth('Enter a room ID to monitor:');
}

// Handle user input
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

let currentRoomId = null;
let inputBuffer = '';
let monitorInterval = null;

// Single event listener for input
process.stdin.on('data', (key) => {
  if (key === '\u0003') { // Ctrl+C
    if (monitorInterval) {
      clearInterval(monitorInterval);
    }
    logToBoth('\n🎮 Live monitor stopped');
    logToBoth(`\n=== ROOM MONITOR LOG ENDED: ${new Date().toISOString()} ===\n`);
    process.exit(0);
  } else if (key === '\r' || key === '\n') { // Enter
    if (!currentRoomId) {
      // First time - check if input is a room ID or empty
      if (inputBuffer.trim()) {
        currentRoomId = inputBuffer.trim();
        logToBoth(`\n🎮 Monitoring room: ${currentRoomId}`);
        logToBoth('Press Ctrl+C to stop\n');
        
        // Start monitoring
        monitorInterval = setInterval(() => {
          displayRoomState(currentRoomId);
        }, 1000);
      } else {
        listRooms();
      }
    }
    inputBuffer = '';
  } else {
    inputBuffer += key;
  }
});

// Initial setup
setTimeout(() => {
  if (!currentRoomId) {
    listRooms();
  }
}, 100);
