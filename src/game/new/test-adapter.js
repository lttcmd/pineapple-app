/**
 * Test file for the GameEngineAdapter
 * Tests the bridge between new GameEngine and existing socket handlers
 */

import { 
  createRoomHandler, 
  joinRoomHandler, 
  startRoundHandler, 
  readyHandler,
  placeHandler,
  discardHandler,
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
      rooms: new Map([
        ['test-room-123', new Set(['socket1', 'socket2'])]
      ])
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

// Test the adapter
function testGameEngineAdapter() {
  console.log('🧪 TESTING GAME ENGINE ADAPTER');
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
  
  // Restore original emit
  mockSocket.emit = originalEmit;
  
  if (!createdRoomId) {
    console.error('❌ Failed to create room');
    return;
  }
  
  console.log(`📋 Using room ID: ${createdRoomId}`);
  
  // Test 2: Join room
  console.log('\n🎯 Test 2: Join room');
  joinRoomHandler(mockIO, mockSocket, { 
    roomId: createdRoomId, 
    name: 'Alice' 
  });
  
  // Test 3: Join second player
  console.log('\n🎯 Test 3: Join second player');
  const mockSocket2 = {
    ...mockSocket,
    id: 'socket2',
    user: { sub: 'player2' }
  };
  joinRoomHandler(mockIO, mockSocket2, { 
    roomId: createdRoomId, 
    name: 'Bob' 
  });
  
  // Test 4: Start round
  console.log('\n🎯 Test 4: Start round');
  startRoundHandler(mockIO, mockSocket, { roomId: createdRoomId });
  
  // Test 5: Place cards
  console.log('\n🎯 Test 5: Place cards');
  placeHandler(mockIO, mockSocket, {
    roomId: createdRoomId,
    placements: [
      { row: 'top', card: 'Ah' },
      { row: 'middle', card: 'Kh' },
      { row: 'bottom', card: 'Qh' }
    ]
  });
  
  // Test 6: Discard card
  console.log('\n🎯 Test 6: Discard card');
  discardHandler(mockIO, mockSocket, {
    roomId: createdRoomId,
    card: 'Jh'
  });
  
  // Test 7: Ready action
  console.log('\n🎯 Test 7: Ready action');
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
  
  // Test 8: Check expired timers
  console.log('\n🎯 Test 8: Check expired timers');
  checkExpiredTimers();
  
  // Test 9: Get debug info
  console.log('\n🎯 Test 9: Get debug info');
  const debugInfo = getDebugInfo();
  console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
  
  console.log('\n✅ Adapter test completed successfully!');
}

// Run the test
testGameEngineAdapter();
