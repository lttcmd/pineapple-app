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
  console.log(`Player currentDeal:`, player.currentDeal);
  
  const isInitial = room.phase === "initial-set";
  const autoPlacements = [];
  const discards = [];
  
  if (isInitial) {
    // Initial set: place all 5 cards from currentDeal
    console.log(`Initial set phase - placing all 5 cards`);
    const cardsToPlace = player.currentDeal.slice();
    
    // Place cards in order: top (3 slots), middle (5 slots), bottom (5 slots)
    for (const card of cardsToPlace) {
      if (player.board.top.length < 3) {
        autoPlacements.push({ row: "top", card });
        player.board.top.push(card);
      } else if (player.board.middle.length < 5) {
        autoPlacements.push({ row: "middle", card });
        player.board.middle.push(card);
      } else if (player.board.bottom.length < 5) {
        autoPlacements.push({ row: "bottom", card });
        player.board.bottom.push(card);
      } else {
        // All rows are full, discard the card
        discards.push(card);
        player.discards.push(card);
      }
    }
  } else {
    // Pineapple round: place 2 cards, discard 1 from currentDeal
    console.log(`Pineapple round - placing 2 cards, discarding 1`);
    const cardsToProcess = player.currentDeal.slice();
    
    // Place first 2 cards in order: top, middle, bottom
    for (let i = 0; i < 2 && cardsToProcess.length > 0; i++) {
      const card = cardsToProcess.shift();
      if (player.board.top.length < 3) {
        autoPlacements.push({ row: "top", card });
        player.board.top.push(card);
      } else if (player.board.middle.length < 5) {
        autoPlacements.push({ row: "middle", card });
        player.board.middle.push(card);
      } else if (player.board.bottom.length < 5) {
        autoPlacements.push({ row: "bottom", card });
        player.board.bottom.push(card);
      } else {
        // All rows are full, discard the card
        discards.push(card);
        player.discards.push(card);
      }
    }
    
    // Discard the remaining card
    if (cardsToProcess.length > 0) {
      const cardToDiscard = cardsToProcess[0];
      discards.push(cardToDiscard);
      player.discards.push(cardToDiscard);
    }
  }
  
  // Clear hand and currentDeal, mark as ready
  player.hand = [];
  player.currentDeal = [];
  player.ready = true;
  
  console.log(`Auto-commit result:`, { autoPlacements, discards });
  console.log(`Player board after auto-commit:`, player.board);
  console.log(`Player hand after auto-commit:`, player.hand);
  console.log(`Player ready status:`, player.ready);
  
  return { autoPlacements, discards };
}
