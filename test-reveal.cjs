const io = require('socket.io-client');

const socket = io('http://localhost:3000');

// Test scoring data for room 5997
const testRevealData = {
  roomId: '5997',
  pairwise: [{
    aUserId: 'player1',
    bUserId: 'player2',
    a: {
      lines: { top: 5, middle: 8, bottom: 12 },
      royaltiesBreakdown: { top: 0, middle: 0, bottom: 0 },
      scoop: 0
    },
    b: {
      lines: { top: 3, middle: 6, bottom: 10 },
      royaltiesBreakdown: { top: 0, middle: 0, bottom: 0 },
      scoop: 0
    }
  }]
};

console.log('Sending reveal event to room 5997...');
socket.emit('round:reveal', testRevealData);

setTimeout(() => {
  console.log('Reveal event sent to room 5997!');
  socket.disconnect();
  process.exit(0);
}, 1000);
