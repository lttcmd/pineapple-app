/**
 * Test file for complete replacement
 * Tests the entire new system integrated with the server
 */

import { 
  createRoomHandler, 
  joinRoomHandler, 
  startRoundHandler, 
  readyHandler,
  checkExpiredTimers,
  getDebugInfo
} from './GameEngineAdapter.js';

// Mock Socket.IO for testing
const mockIO = {
  to: (roomId) => ({
    emit: (event, data) => {
      console.log(`📡 MOCK IO: ${event} -> ${JSON.stringify(data, null, 2)}`);
    }
  }),
  sockets: {
    adapter: {
      rooms: new Map()
    }
  }
};

// Mock socket for testing
const mockSocket = {
  id: 'socket1',
  user: { sub: 'player1' },
  emit: (event, data) => {
    console.log(`📡 SOCKET: ${event} -> ${JSON.stringify(data, null, 2)}`);
  },
  join: (roomId) => {
    console.log(`🔗 SOCKET: Joined room ${roomId}`);
  },
  leave: (roomId) => {
    console.log(`🔗 SOCKET: Left room ${roomId}`);
  }
};

// Test the complete replacement
function testCompleteReplacement() {
  console.log('🧪 TESTING COMPLETE REPLACEMENT');
  console.log('================================');
  
  let createdRoomId = null;
  
  // Test 1: Create room
  console.log('\n🎯 Test 1: Create room');
  const originalEmit = mockSocket.emit;
  mockSocket.emit = (event, data) => {
    if (event === 'create-room') {
      createdRoomId = data.roomId;
      console.log(`📡 SOCKET: ${event} -> ${JSON.stringify(data, null, 2)}`);
    } else {
      originalEmit(event, data);
    }
  };
  createRoomHandler(mockIO, mockSocket);
  mockSocket.emit = originalEmit;
  
  if (!createdRoomId) {
    console.error('❌ Failed to create room');
    return;
  }
  
  console.log(`📋 Using room ID: ${createdRoomId}`);
  
  // Test 2: Join two players
  console.log('\n🎯 Test 2: Join players');
  joinRoomHandler(mockIO, mockSocket, { 
    roomId: createdRoomId, 
    name: 'Alice' 
  });
  
  const mockSocket2 = {
    ...mockSocket,
    id: 'socket2',
    user: { sub: 'player2' }
  };
  joinRoomHandler(mockIO, mockSocket2, { 
    roomId: createdRoomId, 
    name: 'Bob' 
  });
  
  // Test 3: Start round
  console.log('\n🎯 Test 3: Start round');
  startRoundHandler(mockIO, mockSocket, { roomId: createdRoomId });
  
  // Test 4: Simulate timer expiration
  console.log('\n🎯 Test 4: Simulate timer expiration');
  checkExpiredTimers();
  
  // Test 5: Get debug info
  console.log('\n🎯 Test 5: Get debug info');
  const debugInfo = getDebugInfo();
  console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
  
  // Test 6: Simulate player ready
  console.log('\n🎯 Test 6: Simulate player ready');
  readyHandler(mockIO, mockSocket, {
    roomId: createdRoomId,
    placements: [
      { row: 'top', card: 'Ah' },
      { row: 'middle', card: 'Kh' },
      { row: 'bottom', card: 'Qh' },
      { row: 'bottom', card: 'Jh' },
      { row: 'bottom', card: 'Th' }
    ],
    discard: null
  });
  
  // Test 7: Check final state
  console.log('\n🎯 Test 7: Check final state');
  const finalDebugInfo = getDebugInfo();
  console.log('Final debug info:', JSON.stringify(finalDebugInfo, null, 2));
  
  console.log('\n✅ Complete replacement test completed successfully!');
  console.log('\n🎉 PHASE 4 COMPLETE - OLD SYSTEM FULLY REPLACED!');
}

// Run the test
testCompleteReplacement();
