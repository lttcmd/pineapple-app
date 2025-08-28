import { startPlayerTimer, stopPlayerTimer, isPlayerTimerExpired, autoPlaceCards } from './src/game/state.js';

console.log('🧪 Starting Individual Player Timers Test...\n');

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
  handCardIndex: 0,
  timer: null
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
  handCardIndex: 0,
  timer: null
};

console.log('✅ Test setup complete');
console.log('Fantasyland Player:', fantasylandPlayer.name, '- 14 cards, inFantasyland:', fantasylandPlayer.inFantasyland);
console.log('Normal Player:', normalPlayer.name, '- 5 cards, inFantasyland:', normalPlayer.inFantasyland);

// Start individual timers for each player
console.log('\n⏰ Starting individual player timers...');

const fantasylandTimer = startPlayerTimer(fantasylandPlayer, 'fantasyland');
console.log('Fantasyland timer:', fantasylandTimer);

const normalTimer = startPlayerTimer(normalPlayer, 'initial-set');
console.log('Normal timer:', normalTimer);

// Test timer expiration at different times
console.log('\n⏰ Testing timer expiration...');

// Test normal player timer after 16 seconds (should expire)
setTimeout(() => {
  console.log('\n🔍 Checking normal player timer after 16 seconds...');
  
  if (isPlayerTimerExpired(normalPlayer)) {
    console.log('⏰ Normal player timer has expired!');
    
    console.log('🎯 Auto-placing cards for normal player...');
    const { placements, discard } = autoPlaceCards(normalPlayer, 'initial-set');
    
    console.log('Cards placed:', placements.length);
    console.log('Cards remaining in hand:', normalPlayer.hand.length);
    console.log('Discard:', discard);
    
    // Stop the timer
    stopPlayerTimer(normalPlayer);
    console.log('✅ Normal player timer stopped');
  } else {
    console.log('Normal player timer has not expired yet');
  }
}, 16000);

// Test Fantasyland player timer after 51 seconds (should expire)
setTimeout(() => {
  console.log('\n🔍 Checking Fantasyland player timer after 51 seconds...');
  
  if (isPlayerTimerExpired(fantasylandPlayer)) {
    console.log('⏰ Fantasyland player timer has expired!');
    
    console.log('🎯 Auto-placing cards for Fantasyland player...');
    const { placements, discard } = autoPlaceCards(fantasylandPlayer, 'fantasyland');
    
    console.log('Cards placed:', placements.length);
    console.log('Cards remaining in hand:', fantasylandPlayer.hand.length);
    console.log('Discard:', discard);
    
    // Stop the timer
    stopPlayerTimer(fantasylandPlayer);
    console.log('✅ Fantasyland player timer stopped');
  } else {
    console.log('Fantasyland player timer has not expired yet');
  }
}, 51000);

console.log('\n⏳ Test running... Check back in 51 seconds for results');
console.log('Expected:');
console.log('- Normal player timer expires after 15 seconds');
console.log('- Fantasyland player timer expires after 50 seconds');
console.log('- Each player gets correct auto-placement based on their phase type');
