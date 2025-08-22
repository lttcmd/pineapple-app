// test-mixed-mode.js - Automated test for mixed mode fantasyland bug
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3000';

// Test configuration - use existing room
const TEST_CONFIG = {
  roomId: 'JARS', // Use the room that exists
};

// Helper functions
async function makeRequest(endpoint, data = null) {
  try {
    const response = await fetch(`${SERVER_URL}${endpoint}`, {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined
    });
    return await response.json();
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    return null;
  }
}

async function getRoomState() {
  const data = await makeRequest('/monitor');
  if (!data || !data.rooms) return null;
  return data.rooms[TEST_CONFIG.roomId];
}

function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

function logRoomState(room) {
  if (!room) {
    log('❌ Room not found');
    return;
  }
  
  log(`📊 Phase: ${room.phase}, Round: ${room.round}`);
  for (const [userId, player] of Object.entries(room.players)) {
    log(`👤 ${player.name}: Ready=${player.ready}, Fantasyland=${player.inFantasyland}, HandIndex=${player.handCardIndex}, HasPlayed=${player.hasPlayedFantasylandHand}`);
    log(`   Hand: [${player.hand.join(', ')}]`);
    log(`   Board: T${player.board.top.length}/M${player.board.middle.length}/B${player.board.bottom.length}`);
  }
}



// Test the current mixed mode state
async function testCurrentMixedModeState() {
  log('🧪 TESTING CURRENT MIXED MODE STATE');
  
  // Get current room state
  let room = await getRoomState();
  if (!room) {
    log('❌ Room not found - cannot test');
    return;
  }
  
  logRoomState(room);
  
  // Check if we're in mixed mode
  const fantasylandPlayer = Object.values(room.players).find(p => p.inFantasyland);
  const normalPlayer = Object.values(room.players).find(p => !p.inFantasyland);
  
  if (!fantasylandPlayer || !normalPlayer) {
    log('❌ Mixed mode not detected - both players must be in different modes');
    log('   Current players:');
    for (const [userId, player] of Object.entries(room.players)) {
      log(`     ${player.name}: Fantasyland=${player.inFantasyland}`);
    }
    return;
  }
  
  log(`✅ Mixed mode detected:`);
  log(`   Fantasyland Player: ${fantasylandPlayer.name}`);
  log(`   Normal Player: ${normalPlayer.name}`);
  
  // Test 1: Initial state validation
  log('\n📋 TEST 1: Initial State Validation');
  
  if (fantasylandPlayer.handCardIndex !== 14) {
    log(`❌ BUG: Fantasyland player has ${fantasylandPlayer.handCardIndex} cards, should have 14`);
  } else {
    log(`✅ Fantasyland player has correct 14 cards`);
  }
  
  if (normalPlayer.handCardIndex !== 5) {
    log(`❌ BUG: Normal player has ${normalPlayer.handCardIndex} cards, should have 5`);
  } else {
    log(`✅ Normal player has correct 5 cards`);
  }
  
  // Test 2: Check for fantasyland player getting extra cards
  log('\n📋 TEST 2: Fantasyland Player Extra Cards Check');
  
  if (fantasylandPlayer.handCardIndex > 14) {
    log(`❌ CRITICAL BUG: Fantasyland player has ${fantasylandPlayer.handCardIndex} cards, should never exceed 14!`);
    if (room.handCards && room.handCards.length > 14) {
      const extraCards = room.handCards.slice(14, fantasylandPlayer.handCardIndex);
      log(`   Extra cards: [${extraCards.join(', ')}]`);
    }
  } else {
    log(`✅ Fantasyland player has correct number of cards: ${fantasylandPlayer.handCardIndex}`);
  }
  
  // Test 3: Check ready states
  log('\n📋 TEST 3: Ready States');
  
  if (fantasylandPlayer.ready) {
    log(`✅ Fantasyland player is ready`);
    if (fantasylandPlayer.hasPlayedFantasylandHand) {
      log(`✅ Fantasyland player correctly marked hasPlayedFantasylandHand = true`);
    } else {
      log(`❌ BUG: Fantasyland player should have hasPlayedFantasylandHand = true`);
    }
  } else {
    log(`ℹ️  Fantasyland player not ready yet`);
  }
  
  if (normalPlayer.ready) {
    log(`✅ Normal player is ready`);
    if (normalPlayer.handCardIndex === 5) {
      log(`ℹ️  Normal player completed round 1, should get next 3 cards`);
    }
  } else {
    log(`ℹ️  Normal player not ready yet`);
  }
  
  // Test 4: Monitor for progression
  log('\n📋 TEST 4: Monitoring for progression (waiting 5 seconds)...');
  
  const initialNormalHandIndex = normalPlayer.handCardIndex;
  const initialFantasylandHandIndex = fantasylandPlayer.handCardIndex;
  
  for (let i = 0; i < 5; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedRoom = await getRoomState();
    if (updatedRoom) {
      const updatedNormalPlayer = Object.values(updatedRoom.players).find(p => !p.inFantasyland);
      const updatedFantasylandPlayer = Object.values(updatedRoom.players).find(p => p.inFantasyland);
      
      if (updatedNormalPlayer && updatedNormalPlayer.handCardIndex > initialNormalHandIndex) {
        log(`✅ Normal player progressed: ${initialNormalHandIndex} → ${updatedNormalPlayer.handCardIndex}`);
      }
      
      if (updatedFantasylandPlayer && updatedFantasylandPlayer.handCardIndex > initialFantasylandHandIndex) {
        log(`❌ CRITICAL BUG: Fantasyland player got extra cards: ${initialFantasylandHandIndex} → ${updatedFantasylandPlayer.handCardIndex}`);
      }
    }
  }
  
  log('\n🎉 Current mixed mode state test completed!');
}

async function runTests() {
  log('🚀 Starting automated mixed mode scenario test...');
  
  // Wait a moment for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test current mixed mode state
  await testCurrentMixedModeState();
  
  log('🏁 Tests completed');
}

// Run the tests
runTests().catch(console.error);
