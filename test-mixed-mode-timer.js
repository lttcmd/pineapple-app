import { startTimer, stopTimer, isTimerExpired, autoPlaceCards } from './src/game/state.js';

console.log('🧪 Starting Mixed Mode Timer Test...\n');

// Create a mock room with timer
const room = {
  id: 'test-mixed-room-123',
  phase: 'initial-set',
  timer: {
    isActive: false,
    phaseType: null,
    deadlineEpochMs: null,
    durationMs: null,
    startTime: null
  }
};

// Create mock players - one Fantasyland, one normal
const fantasylandPlayer = {
  userId: 'fantasyland-user',
  name: 'Fantasyland Player',
  socketId: 'socket-fantasy',
  board: { top: [], middle: [], bottom: [] },
  hand: [
    // 14 cards for Fantasyland player
    { rank: 'A', suit: 'h' }, { rank: 'K', suit: 'd' }, { rank: 'Q', suit: 'c' },
    { rank: 'J', suit: 's' }, { rank: 'T', suit: 'h' }, { rank: '9', suit: 'd' },
    { rank: 'A', suit: 'c' }, { rank: 'K', suit: 's' }, { rank: 'Q', suit: 'h' },
    { rank: 'J', suit: 'd' }, { rank: 'T', suit: 'c' }, { rank: '9', suit: 's' },
    { rank: 'A', suit: 'd' }, { rank: 'K', suit: 'h' }
  ],
  discards: [],
  ready: false,
  roundComplete: false,
  fantasyland: true,
  inFantasyland: true,
  handCardIndex: 0
};

const normalPlayer = {
  userId: 'normal-user',
  name: 'Normal Player',
  socketId: 'socket-normal',
  board: { top: [], middle: [], bottom: [] },
  hand: [
    // 5 cards for normal player
    { rank: 'A', suit: 's' },
    { rank: 'K', suit: 'c' },
    { rank: 'Q', suit: 'd' },
    { rank: 'J', suit: 'h' },
    { rank: 'T', suit: 's' }
  ],
  discards: [],
  ready: false,
  roundComplete: false,
  fantasyland: false,
  inFantasyland: false,
  handCardIndex: 0
};

console.log('✅ Test setup complete');
console.log('Fantasyland Player:', fantasylandPlayer.name, '- 14 cards, inFantasyland:', fantasylandPlayer.inFantasyland);
console.log('Normal Player:', normalPlayer.name, '- 5 cards, inFantasyland:', normalPlayer.inFantasyland);

// Start timer for mixed mode (50 seconds for Fantasyland)
startTimer(room, 'fantasyland');
console.log('\n⏰ Timer started for mixed mode (50 seconds)');
console.log('Timer object:', room.timer);

// Simulate timer running for 51 seconds (1 second past the 50-second limit)
console.log('\n⏰ Simulating timer running for 51 seconds...');
setTimeout(() => {
  console.log('\n🔍 Checking timer expiration...');
  
  if (isTimerExpired(room)) {
    console.log('⏰ Timer has expired!');
    
    // Test auto-placement for both players
    const players = [fantasylandPlayer, normalPlayer];
    
    console.log('\n🎯 Performing auto-placement...');
    
    for (const player of players) {
      console.log(`\n🎯 Auto-placing cards for ${player.name}`);
      console.log('Hand before auto-placement:', player.hand.map(c => `${c.rank}${c.suit}`));
      console.log('Board before auto-placement:', player.board);
      
      // Determine the correct phase type for this specific player
      let playerPhaseType;
      if (player.inFantasyland) {
        playerPhaseType = 'fantasyland';
      } else if (room.phase === 'initial-set') {
        playerPhaseType = 'initial-set';
      } else {
        playerPhaseType = 'round';
      }
      
      console.log(`🎯 Using phase type: ${playerPhaseType} for ${player.name}`);
      
      const { placements, discard } = autoPlaceCards(player, playerPhaseType);
      
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
      console.log('Cards placed:', placements.length);
      console.log('Cards remaining in hand:', player.hand.length);
    }
    
    // Stop the timer
    stopTimer(room);
    
    console.log('\n✅ Auto-placement completed!');
    console.log('Final room state:');
    console.log('- Timer active:', room.timer.isActive);
    console.log('- All players ready:', players.every(p => p.ready));
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('Fantasyland Player:');
    console.log('  - Should have placed 13 cards');
    console.log('  - Should have 1 card remaining in hand');
    console.log('  - Should be ready for next round');
    
    console.log('Normal Player:');
    console.log('  - Should have placed 5 cards');
    console.log('  - Should have 0 cards remaining in hand');
    console.log('  - Should be ready for next round');
    
  } else {
    console.log('Timer has not expired yet');
    console.log('Time remaining:', room.timer.deadlineEpochMs - Date.now(), 'ms');
  }
  
}, 51000); // Wait 51 seconds

console.log('\n⏳ Test running... Check back in 51 seconds for results');
