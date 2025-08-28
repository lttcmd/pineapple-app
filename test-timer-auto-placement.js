import { startTimer, stopTimer, isTimerExpired, autoPlaceCards } from './src/game/state.js';

console.log('🧪 Starting Timer Auto-Placement Test...\n');

// Create a mock room with timer
const room = {
  id: 'test-room-123',
  timer: {
    isActive: false,
    phaseType: null,
    deadlineEpochMs: null,
    durationMs: null,
    startTime: null
  }
};

// Create mock players with cards
const player1 = {
  userId: 'test-user-1',
  name: 'Player A',
  socketId: 'socket-1',
  board: { top: [], middle: [], bottom: [] },
  hand: [
    { rank: 'A', suit: 'h' },
    { rank: 'K', suit: 'd' },
    { rank: 'Q', suit: 'c' },
    { rank: 'J', suit: 's' },
    { rank: 'T', suit: 'h' }
  ],
  discards: [],
  ready: false,
  roundComplete: false,
  fantasyland: false,
  handCardIndex: 0
};

const player2 = {
  userId: 'test-user-2', 
  name: 'Player B',
  socketId: 'socket-2',
  board: { top: [], middle: [], bottom: [] },
  hand: [
    { rank: '9', suit: 'h' },
    { rank: 'T', suit: 'd' },
    { rank: 'J', suit: 'c' },
    { rank: 'Q', suit: 's' },
    { rank: 'K', suit: 'h' }
  ],
  discards: [],
  ready: false,
  roundComplete: false,
  fantasyland: false,
  handCardIndex: 0
};

console.log('✅ Test setup complete');

// Start timer for initial-set phase (15 seconds)
startTimer(room, 'initial-set');
console.log('\n⏰ Timer started for initial-set phase');
console.log('Timer object:', room.timer);

// Simulate timer running for 16 seconds (1 second past the 15-second limit)
console.log('\n⏰ Simulating timer running for 16 seconds...');
setTimeout(() => {
  console.log('\n🔍 Checking timer expiration...');
  
  if (isTimerExpired(room)) {
    console.log('⏰ Timer has expired!');
    
    // Test auto-placement for both players
    const players = [player1, player2];
    
    console.log('\n🎯 Performing auto-placement...');
    
    for (const player of players) {
      console.log(`\n🎯 Auto-placing cards for ${player.name}`);
      console.log('Hand before auto-placement:', player.hand.map(c => `${c.rank}${c.suit}`));
      console.log('Board before auto-placement:', player.board);
      
      const { placements, discard } = autoPlaceCards(player, room.timer.phaseType);
      
      // Mark player as ready
      player.ready = true;
      player.roundComplete = true;
      
      // Remove placed cards from hand
      for (const placement of placements) {
        const cardIndex = player.hand.indexOf(placement.card);
        if (cardIndex !== -1) {
          player.hand.splice(cardIndex, 1);
        }
      }
      
      // Handle discard
      if (discard) {
        player.discards.push(discard);
        const discardIndex = player.hand.indexOf(discard);
        if (discardIndex !== -1) {
          player.hand.splice(discardIndex, 1);
        }
      }
      
      console.log('Hand after auto-placement:', player.hand.map(c => `${c.rank}${c.suit}`));
      console.log('Board after auto-placement:', player.board);
      console.log('Discards:', player.discards.map(c => `${c.rank}${c.suit}`));
      console.log('Ready:', player.ready);
    }
    
    // Stop the timer
    stopTimer(room);
    
    console.log('\n✅ Auto-placement completed!');
    console.log('Final room state:');
    console.log('- Timer active:', room.timer.isActive);
    console.log('- All players ready:', players.every(p => p.ready));
    
  } else {
    console.log('Timer has not expired yet');
    console.log('Time remaining:', room.timer.deadlineEpochMs - Date.now(), 'ms');
  }
  
}, 16000); // Wait 16 seconds

console.log('\n⏳ Test running... Check back in 16 seconds for results');
