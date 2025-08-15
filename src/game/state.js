import rules from "./rules.js";
import { makeDeck, shuffleDeterministic } from "./deck.js";
import { Events } from "../net/events.js";

// Timer constants
const ROUND_TIMER_DURATION = 15000; // 15 seconds in milliseconds
const TIMER_UPDATE_INTERVAL = 16; // 16ms for 60fps smooth animation

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
    },
    // Next round ready state
    nextRoundReady: new Set() // Set of userIds ready for next round
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
  
  // Reset next round ready state
  room.nextRoundReady.clear();
  
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

export function allReadyForNextRound(room) {
  return [...room.players.values()].every(p => room.nextRoundReady.has(p.userId));
}

// Timer management functions
export function startTimer(room, io, onTimeout) {
  // Clear any existing timer
  stopTimer(room, io);
  
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
      stopTimer(room, io);
      onTimeout(room, io);
    }
  }, TIMER_UPDATE_INTERVAL);
  
  // Send initial timer start event
  io.to(room.id).emit(Events.TIMER_START, {
    timeLeft: ROUND_TIMER_DURATION,
    isActive: true
  });
}

export function stopTimer(room, io) {
  if (room.timer.intervalId) {
    clearInterval(room.timer.intervalId);
    room.timer.intervalId = null;
  }
  room.timer.isActive = false;
  
  // Send timer stop event
  if (io) {
    io.to(room.id).emit(Events.TIMER_STOP);
  }
}

export function autoCommitPlayer(room, player) {
  console.log(`=== AUTO-COMMIT PUNISHMENT FOR PLAYER ${player.userId} ===`);
  console.log(`Phase: ${room.phase}, RoundIndex: ${room.roundIndex}`);
  console.log(`Hand before:`, player.hand);
  console.log(`Board before:`, player.board);
  console.log(`CurrentDeal:`, player.currentDeal);
  console.log(`Discards before:`, player.discards);
  
  const isInitial = room.phase === "initial-set";
  const autoPlacements = [];
  const discards = [];
  
  if (isInitial) {
    // Initial set: place all 5 cards from currentDeal as punishment
    console.log(`🎯 INITIAL SET PUNISHMENT: Placing all 5 cards automatically`);
    const cardsToPlace = player.currentDeal.slice();
    console.log(`Cards to place:`, cardsToPlace);
    
    // Place cards in order: top (3 slots), middle (5 slots), bottom (5 slots)
    for (const card of cardsToPlace) {
      if (player.board.top.length < 3) {
        console.log(`Placing ${card} in TOP row`);
        autoPlacements.push({ row: "top", card });
        player.board.top.push(card);
      } else if (player.board.middle.length < 5) {
        console.log(`Placing ${card} in MIDDLE row`);
        autoPlacements.push({ row: "middle", card });
        player.board.middle.push(card);
      } else if (player.board.bottom.length < 5) {
        console.log(`Placing ${card} in BOTTOM row`);
        autoPlacements.push({ row: "bottom", card });
        player.board.bottom.push(card);
      } else {
        // All rows are full, discard the card
        console.log(`All rows full, discarding ${card}`);
        discards.push(card);
        player.discards.push(card);
      }
    }
  } else {
    // Pineapple round: place 2 cards, discard 1 from currentDeal as punishment
    console.log(`🎯 PINEAPPLE ROUND PUNISHMENT: Placing 2 cards, discarding 1`);
    const cardsToProcess = player.currentDeal.slice();
    console.log(`Cards to process:`, cardsToProcess);
    
    // Place first 2 cards in order: top, middle, bottom
    for (let i = 0; i < 2 && cardsToProcess.length > 0; i++) {
      const card = cardsToProcess.shift();
      if (player.board.top.length < 3) {
        console.log(`Placing ${card} in TOP row`);
        autoPlacements.push({ row: "top", card });
        player.board.top.push(card);
      } else if (player.board.middle.length < 5) {
        console.log(`Placing ${card} in MIDDLE row`);
        autoPlacements.push({ row: "middle", card });
        player.board.middle.push(card);
      } else if (player.board.bottom.length < 5) {
        console.log(`Placing ${card} in BOTTOM row`);
        autoPlacements.push({ row: "bottom", card });
        player.board.bottom.push(card);
      } else {
        // All rows are full, discard the card
        console.log(`All rows full, discarding ${card}`);
        discards.push(card);
        player.discards.push(card);
      }
    }
    
    // Discard the remaining card
    if (cardsToProcess.length > 0) {
      const cardToDiscard = cardsToProcess[0];
      console.log(`Discarding remaining card: ${cardToDiscard}`);
      discards.push(cardToDiscard);
      player.discards.push(cardToDiscard);
    }
  }
  
  // Clear hand and currentDeal, mark as ready (punishment complete)
  console.log(`Clearing hand and currentDeal, marking as ready`);
  player.hand = [];
  player.currentDeal = [];
  player.ready = true;
  
  console.log(`=== AUTO-COMMIT RESULT ===`);
  console.log(`Auto-placements:`, autoPlacements);
  console.log(`Discards:`, discards);
  console.log(`Board after:`, player.board);
  console.log(`Hand after:`, player.hand);
  console.log(`Discards after:`, player.discards);
  console.log(`Ready status:`, player.ready);
  console.log(`=== END AUTO-COMMIT ===`);
  
  return { autoPlacements, discards };
}
