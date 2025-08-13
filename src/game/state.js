import rules from "./rules.js";
import { makeDeck, shuffleDeterministic } from "./deck.js";
import { Events } from "../net/events.js";

// Timer constants
const ROUND_TIMER_DURATION = 15000; // 15 seconds in milliseconds
const TIMER_UPDATE_INTERVAL = 100; // 100ms for smooth updates

export function createRoom(roomId) {
  return {
    id: roomId,
    players: new Map(), // userId -> { userId, name, socketId, board, hand, discards, ready }
    round: 0,
    seed: null,
    phase: "lobby", // lobby | initial-set | round | reveal
    sharedDeck: [],
    roundIndex: 0,
    // Timer state
    timer: {
      isActive: false,
      timeLeft: ROUND_TIMER_DURATION,
      intervalId: null,
      startTime: null
    }
  };
}

export function startRound(room) {
  room.round += 1;
  room.phase = "initial-set";
  room.roundIndex = 0;
  room.seed = `${room.id}:${room.round}:${Date.now()}`;
  room.sharedDeck = shuffleDeterministic(makeDeck(), room.seed);

  for (const p of room.players.values()) {
    p.board = { top: [], middle: [], bottom: [] };
    p.hand = [];
    p.discards = [];
    p.ready = false;
    p.currentDeal = [];
  }
  dealToAll(room, rules.deal.initialSetCount);
}

export function dealToAll(room, nCards) {
  for (let i = 0; i < nCards; i++) {
    const card = room.sharedDeck.pop();
    for (const p of room.players.values()) p.hand.push(card);
  }
}

export function allReady(room) {
  return [...room.players.values()].every(p => p.ready);
}

// Timer management functions
export function startTimer(room, io, onTimeout) {
  // Clear any existing timer
  stopTimer(room);
  
  room.timer.isActive = true;
  room.timer.timeLeft = ROUND_TIMER_DURATION;
  room.timer.startTime = Date.now();
  
  // Start the countdown interval
  room.timer.intervalId = setInterval(() => {
    room.timer.timeLeft -= TIMER_UPDATE_INTERVAL;
    
    // Broadcast timer update to all players in the room
    io.to(room.id).emit(Events.TIMER_UPDATE, {
      timeLeft: room.timer.timeLeft,
      isActive: room.timer.isActive
    });
    
    // Check if timer expired
    if (room.timer.timeLeft <= 0) {
      stopTimer(room);
      onTimeout(room, io);
    }
  }, TIMER_UPDATE_INTERVAL);
  
  // Send initial timer start event
  io.to(room.id).emit(Events.TIMER_START, {
    timeLeft: ROUND_TIMER_DURATION,
    isActive: true
  });
}

export function stopTimer(room) {
  if (room.timer.intervalId) {
    clearInterval(room.timer.intervalId);
    room.timer.intervalId = null;
  }
  room.timer.isActive = false;
  
  // Send timer stop event
  if (room.io) {
    room.io.to(room.id).emit(Events.TIMER_STOP);
  }
}

export function autoCommitPlayer(room, player) {
  console.log(`Auto-committing player ${player.userId} in phase ${room.phase}`);
  console.log(`Player hand before auto-commit:`, player.hand);
  console.log(`Player board before auto-commit:`, player.board);
  
  // Auto-place remaining cards in order: top row first, then middle, then bottom
  const remainingCards = player.hand.slice();
  const autoPlacements = [];
  
  // Fill top row (3 slots)
  const topSlots = 3 - player.board.top.length;
  for (let i = 0; i < topSlots && remainingCards.length > 0; i++) {
    autoPlacements.push({ row: "top", card: remainingCards.shift() });
  }
  
  // Fill middle row (5 slots)
  const middleSlots = 5 - player.board.middle.length;
  for (let i = 0; i < middleSlots && remainingCards.length > 0; i++) {
    autoPlacements.push({ row: "middle", card: remainingCards.shift() });
  }
  
  // Fill bottom row (5 slots)
  const bottomSlots = 5 - player.board.bottom.length;
  for (let i = 0; i < bottomSlots && remainingCards.length > 0; i++) {
    autoPlacements.push({ row: "bottom", card: remainingCards.shift() });
  }
  
  // Apply auto-placements
  for (const placement of autoPlacements) {
    player.board[placement.row].push(placement.card);
  }
  
  // Add any remaining cards to discards
  if (remainingCards.length > 0) {
    player.discards.push(...remainingCards);
  }
  
  // Clear hand and mark as ready
  player.hand = [];
  player.ready = true;
  
  // Clear currentDeal since we've processed all cards
  player.currentDeal = [];
  
  console.log(`Auto-commit result:`, { autoPlacements, discards: remainingCards });
  console.log(`Player board after auto-commit:`, player.board);
  console.log(`Player hand after auto-commit:`, player.hand);
  console.log(`Player ready status:`, player.ready);
  
  return { autoPlacements, discards: remainingCards };
}
