/**
 * Test file for the new GameEngine
 * Tests basic functionality without requiring Socket.IO
 */

import { GameEngine } from './GameEngine.js';

// Mock Socket.IO for testing
const mockIO = {
  to: (roomId) => ({
    emit: (event, data) => {
      console.log(`📡 MOCK IO: ${event} -> ${JSON.stringify(data, null, 2)}`);
    }
  })
};

// Test the new game engine
function testGameEngine() {
  console.log('🧪 TESTING NEW GAME ENGINE');
  console.log('============================');
  
  // Create game engine
  const engine = new GameEngine('test-room-123');
  engine.setIO(mockIO);
  
  // Add players
  const player1 = engine.addPlayer('player1', 'Alice', 'socket1', false); // Normal
  const player2 = engine.addPlayer('player2', 'Bob', 'socket2', true);   // Fantasyland
  
  console.log('\n✅ Players added successfully');
  console.log(`Player 1: ${player1.name} (${player1.inFantasyland ? 'Fantasyland' : 'Normal'})`);
  console.log(`Player 2: ${player2.name} (${player2.inFantasyland ? 'Fantasyland' : 'Normal'})`);
  
  // Start a new hand
  console.log('\n🎮 Starting new hand...');
  engine.startNewHand();
  
  // Check initial state
  console.log('\n📊 Initial state:');
  console.log(`Room phase: ${engine.gameState.phase}`);
  console.log(`Mixed mode: ${engine.gameState.isMixedMode}`);
  console.log(`Player 1 cards: ${player1.hand.length} (${player1.hand.join(', ')})`);
  console.log(`Player 2 cards: ${player2.hand.length} (${player2.hand.join(', ')})`);
  console.log(`Player 1 timer: ${engine.gameState.getTimer('player1') ? 'Active' : 'None'}`);
  console.log(`Player 2 timer: ${engine.gameState.getTimer('player2') ? 'Active' : 'None'}`);
  
  // Test player ready action
  console.log('\n🎯 Testing player ready action...');
  const placements = [
    { row: 'top', card: player1.hand[0] },
    { row: 'middle', card: player1.hand[1] },
    { row: 'bottom', card: player1.hand[2] },
    { row: 'bottom', card: player1.hand[3] },
    { row: 'bottom', card: player1.hand[4] }
  ];
  
  engine.handlePlayerReady('player1', placements, null);
  
  console.log('\n📊 After player 1 ready:');
  console.log(`Player 1 ready: ${player1.ready}`);
  console.log(`Player 1 board: Top(${player1.board.top.length}), Middle(${player1.board.middle.length}), Bottom(${player1.board.bottom.length})`);
  console.log(`Player 1 hand: ${player1.hand.length} cards`);
  
  // Test timer expiration (auto-placement)
  console.log('\n⏰ Testing timer expiration...');
  engine.handleTimerExpiration('player2');
  
  console.log('\n📊 After player 2 timer expired:');
  console.log(`Player 2 ready: ${player2.ready}`);
  console.log(`Player 2 board: Top(${player2.board.top.length}), Middle(${player2.board.middle.length}), Bottom(${player2.board.bottom.length})`);
  console.log(`Player 2 hand: ${player2.hand.length} cards`);
  console.log(`Player 2 discards: ${player2.discards.length} cards`);
  
  // Get debug info
  console.log('\n🔍 Debug info:');
  console.log(JSON.stringify(engine.getDebugInfo(), null, 2));
  
  console.log('\n✅ Test completed successfully!');
}

// Run the test
testGameEngine();
