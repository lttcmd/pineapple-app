import { startPlayerTimer, stopPlayerTimer, isPlayerTimerExpired, autoPlaceCards } from './src/game/state.js';

console.log('🎮 Starting Mixed Mode Game Simulation...\n');

// Create Player A (Fantasyland)
const playerA = {
  userId: 'player-a',
  name: 'Player A',
  socketId: 'socket-a',
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

// Create Player B (Normal)
const playerB = {
  userId: 'player-b',
  name: 'Player B',
  socketId: 'socket-b',
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

// Game state
let gameState = {
  round: 1,
  phase: 'initial-set',
  startTime: Date.now()
};

// Clear console function
function clearConsole() {
  console.clear();
}

// Format cards for display
function formatCards(cards) {
  return cards.map(card => `${card.rank}${card.suit}`).join(' ');
}

// Format board for display
function formatBoard(board) {
  const top = board.top.length > 0 ? formatCards(board.top) : 'empty';
  const middle = board.middle.length > 0 ? formatCards(board.middle) : 'empty';
  const bottom = board.bottom.length > 0 ? formatCards(board.bottom) : 'empty';
  return { top, middle, bottom };
}

// Display game state
function displayGameState() {
  clearConsole();
  
  console.log('🎮 MIXED MODE GAME SIMULATION\n');
  console.log('='.repeat(60));
  
  // Player A (Fantasyland)
  const playerATimer = playerA.timer && playerA.timer.isActive ? 
    Math.max(0, Math.ceil((playerA.timer.deadlineEpochMs - Date.now()) / 1000)) : 0;
  
  console.log('Player A');
  console.log('Fantasyland');
  console.log(`Timer: ${playerATimer} seconds`);
  console.log(`Cards in hand: ${formatCards(playerA.hand)}`);
  console.log(`Ready: ${playerA.ready ? 'YES' : 'NO'}`);
  
  const boardA = formatBoard(playerA.board);
  console.log('Board:');
  console.log(`  Top:    ${boardA.top}`);
  console.log(`  Middle: ${boardA.middle}`);
  console.log(`  Bottom: ${boardA.bottom}`);
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // Player B (Normal)
  const playerBTimer = playerB.timer && playerB.timer.isActive ? 
    Math.max(0, Math.ceil((playerB.timer.deadlineEpochMs - Date.now()) / 1000)) : 0;
  
  console.log('Player B');
  console.log('Normal mode');
  console.log(`Round: ${gameState.round}`);
  console.log(`Timer: ${playerBTimer} seconds`);
  console.log(`Cards in hand: ${formatCards(playerB.hand)}`);
  console.log(`Ready: ${playerB.ready ? 'YES' : 'NO'}`);
  
  const boardB = formatBoard(playerB.board);
  console.log('Board:');
  console.log(`  Top:    ${boardB.top}`);
  console.log(`  Middle: ${boardB.middle}`);
  console.log(`  Bottom: ${boardB.bottom}`);
  
  console.log('\n' + '='.repeat(60));
  console.log(`Game Phase: ${gameState.phase}`);
  console.log(`Both Ready: ${playerA.ready && playerB.ready ? 'YES' : 'NO'}`);
  console.log('='.repeat(60));
}

// Start the game
console.log('🎮 Starting Mixed Mode Game...');
console.log('Player A: Fantasyland (14 cards, 50s timer)');
console.log('Player B: Normal (5 cards, 10s timer)');

// Start individual timers
startPlayerTimer(playerA, 'fantasyland');
startPlayerTimer(playerB, 'initial-set');

console.log('⏰ Timers started!');
console.log('Press Ctrl+C to stop\n');

// Timer monitoring loop
const timerCheckInterval = setInterval(() => {
  const now = Date.now();
  
  // Check Player A timer (50 seconds)
  if (playerA.timer && isPlayerTimerExpired(playerA) && !playerA.ready) {
    console.log('\n⏰ Player A timer EXPIRED!');
    console.log('🎯 Auto-placing cards for Player A...');
    
    const { placements, discard } = autoPlaceCards(playerA, 'fantasyland');
    
         // Mark player as ready
     playerA.ready = true;
    
    // Remove placed cards from hand
    for (const placement of placements) {
      const cardIndex = playerA.hand.indexOf(placement.card);
      if (cardIndex !== -1) {
        playerA.hand.splice(cardIndex, 1);
      }
    }
    
    // Handle discard
    if (discard) {
      playerA.discards.push(discard);
      const discardIndex = playerA.hand.indexOf(discard);
      if (discardIndex !== -1) {
        playerA.hand.splice(discardIndex, 1);
      }
    }
    
    // Stop the timer
    stopPlayerTimer(playerA);
    
    console.log(`✅ Player A auto-placement complete: ${placements.length} cards placed`);
  }
  
  // Check Player B timer (15 seconds)
  if (playerB.timer && isPlayerTimerExpired(playerB) && !playerB.ready) {
    console.log('\n⏰ Player B timer EXPIRED!');
    console.log('🎯 Auto-placing cards for Player B...');
    
    const { placements, discard } = autoPlaceCards(playerB, gameState.phase);
    
         // Mark player as ready
     playerB.ready = true;
    
    // Remove placed cards from hand
    for (const placement of placements) {
      const cardIndex = playerB.hand.indexOf(placement.card);
      if (cardIndex !== -1) {
        playerB.hand.splice(cardIndex, 1);
      }
    }
    
    // Handle discard
    if (discard) {
      playerB.discards.push(discard);
      const discardIndex = playerB.hand.indexOf(discard);
      if (discardIndex !== -1) {
        playerB.hand.splice(discardIndex, 1);
      }
    }
    
    // Stop the timer
    stopPlayerTimer(playerB);
    
    console.log(`✅ Player B auto-placement complete: ${placements.length} cards placed`);
  }
  
  // Check if normal player is ready (they continue independently)
  if (playerB.ready && !playerB.roundComplete) {
    console.log('\n🎮 Player B (Normal) ready!');
    
    // Check if this is the final round for normal player
    if (gameState.round >= 5) {
      console.log('🎮 Player B completed all 5 rounds!');
      console.log('🎮 Waiting for Player A (Fantasyland) to finish...');
      playerB.roundComplete = true;
    } else {
      console.log('🎮 Moving to next round for Player B...');
      
      // Reset for next round
      gameState.round++;
      gameState.phase = 'round';
      
      // Reset player B state
      playerB.ready = false;
      
      // Deal new cards for Player B
      playerB.hand = [
        { rank: '9', suit: 'h' },
        { rank: 'T', suit: 'c' },
        { rank: 'J', suit: 'd' }
      ];
      
      // Start new timer for Player B
      startPlayerTimer(playerB, 'round');
      
      console.log('⏰ New round timer started for Player B!');
    }
  }
  
  // Check if Fantasyland player is ready
  if (playerA.ready && !playerA.roundComplete) {
    console.log('\n🎮 Player A (Fantasyland) ready!');
    playerA.roundComplete = true;
  }
  
  // Check if both players have completed their rounds
  if (playerA.roundComplete && playerB.roundComplete) {
    console.log('\n🎮 Both players completed their rounds!');
    console.log('🎮 Moving to reveal phase...');
    process.exit(0);
  }
  
  // Display game state every second
  displayGameState();
  
  // End simulation after 2 minutes
  if (now - gameState.startTime > 120000) {
    console.log('\n🎮 Simulation complete after 2 minutes');
    clearInterval(timerCheckInterval);
    process.exit(0);
  }
}, 1000); // Update every second

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🎮 Simulation stopped by user');
  clearInterval(timerCheckInterval);
  process.exit(0);
});
