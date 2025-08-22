import rules from "./rules.js";
import { makeDeck, shuffleDeterministic } from "./deck.js";
import { Events } from "../net/events.js";



export function createRoom(roomId) {
  return {
    id: roomId,
    players: new Map(), // userId -> { userId, name, socketId, board, hand, discards, ready, inFantasyland, hasPlayedFantasylandHand }
    round: 0,
    seed: null,
    phase: "lobby", // lobby | initial-set | round | reveal
    sharedDeck: [],
    roundIndex: 0,

    // Next round ready state
    nextRoundReady: new Set(), // Set of userIds ready for next round
    
    // Hand management
    handCards: [], // The 17 cards selected for this hand
    currentRound: 1, // Current round within the hand (1-5 for normal mode)
    handComplete: false // Whether the current hand is complete
  };
}

export function startRound(room) {
  room.round += 1;
  room.phase = "initial-set";
  room.roundIndex = 0;
  room.currentRound = 1;
  room.handComplete = false;
  room.seed = `${room.id}:${room.round}:${Date.now()}`;
  
  // Shuffle the deck and select the first 17 cards for this hand
  room.sharedDeck = shuffleDeterministic(makeDeck(), room.seed);
  room.handCards = [];
  for (let i = 0; i < 17; i++) {
    if (room.sharedDeck.length > 0) {
      room.handCards.push(room.sharedDeck.pop());
    }
  }
  
  

  for (const p of room.players.values()) {
    p.board = { top: [], middle: [], bottom: [] };
    p.hand = [];
    p.discards = [];
    p.ready = false;
    p.currentDeal = [];
    p.hasPlayedFantasylandHand = false; // Reset fantasyland hand flag
    p.handCardIndex = 0; // Track which card from handCards to deal next
    p.roundComplete = false; // Track if player has completed current round
    // Note: inFantasyland status is preserved between rounds
  }
  
  // Check if any players are in fantasyland and deal accordingly
  const fantasylandPlayers = [...room.players.values()].filter(p => p.inFantasyland);
  const normalPlayers = [...room.players.values()].filter(p => !p.inFantasyland);
  
  if (fantasylandPlayers.length > 0) {
    // Deal 14 cards to fantasyland players (cards 1-14)
    for (const player of fantasylandPlayers) {
      dealHandCards(room, player, 14);
    }
    
    // Deal 5 cards to normal players (cards 1-5 for round 1)
    if (normalPlayers.length > 0) {
      for (const player of normalPlayers) {
        dealHandCards(room, player, 5);
      }
    }
  } else {
    // No fantasyland players - deal 5 cards to everyone for round 1
    for (const player of room.players.values()) {
      dealHandCards(room, player, 5);
    }
  }
  
  // Reset next round ready state
  room.nextRoundReady.clear();
}

export function dealHandCards(room, player, nCards) {
  for (let i = 0; i < nCards; i++) {
    if (player.handCardIndex >= room.handCards.length) {
      break;
    }
    const card = room.handCards[player.handCardIndex];
    player.handCardIndex++;
    player.hand.push(card);
  }
}

export function dealNextRoundCards(room, player, targetRound = null) {
  // Deal cards for the specified round (or current round if not specified)
  const round = targetRound || room.currentRound;
  let cardsToDeal = 0;
  
  console.log(`🔍 DEAL NEXT ROUND: Player ${player.name}, inFantasyland: ${player.inFantasyland}, hasPlayed: ${player.hasPlayedFantasylandHand}, targetRound: ${targetRound}, handCardIndex: ${player.handCardIndex}`);
  
  if (player.inFantasyland) {
    // Fantasyland player gets all 14 cards at once
    if (!player.hasPlayedFantasylandHand) {
      cardsToDeal = 14;
      console.log(`🔍 DEAL NEXT ROUND: Fantasyland player ${player.name} needs 14 cards`);
    } else {
      // Fantasyland player has already played their hand - no more cards
      console.log(`🔍 DEAL NEXT ROUND: Fantasyland player ${player.name} has already played their hand, returning empty array`);
      return [];
    }
  } else {
    // Normal player gets cards based on round
    switch (round) {
      case 1: cardsToDeal = 5; break; // Cards 1-5
      case 2: cardsToDeal = 3; break; // Cards 6-8
      case 3: cardsToDeal = 3; break; // Cards 9-11
      case 4: cardsToDeal = 3; break; // Cards 12-14
      case 5: cardsToDeal = 3; break; // Cards 15-17
      default: cardsToDeal = 0;
    }
  }
  
  if (cardsToDeal > 0) {
    dealHandCards(room, player, cardsToDeal);
    const result = player.hand.slice(-cardsToDeal);
    return result;
  }
  
  return [];
}

export function dealToAll(room, nCards, specificPlayerId = null) {
  if (specificPlayerId) {
    // Deal to specific player (for fantasyland)
    const player = room.players.get(specificPlayerId);
    if (player) {
      for (let i = 0; i < nCards; i++) {
        if (room.sharedDeck.length === 0) {
          break;
        }
        const card = room.sharedDeck.pop();
        room.cardsDealtThisHand = (room.cardsDealtThisHand || 0) + 1;
        player.hand.push(card);
      }
    }
  } else {
    // Deal to all players (normal mode)
    for (let i = 0; i < nCards; i++) {
      if (room.sharedDeck.length === 0) {
        break;
      }
      const card = room.sharedDeck.pop();
      room.cardsDealtThisHand = (room.cardsDealtThisHand || 0) + 1;
      for (const p of room.players.values()) p.hand.push(card);
    }
  }

}

export function allReady(room) {
  return [...room.players.values()].every(p => p.ready);
}

export function allReadyForNextRound(room) {
  return [...room.players.values()].every(p => room.nextRoundReady.has(p.userId));
}

export function allPlayersCompleteCurrentRound(room) {
  return [...room.players.values()].every(p => p.roundComplete);
}

export function checkHandComplete(room) {
  const normalPlayers = [...room.players.values()].filter(p => !p.inFantasyland);
  const fantasylandPlayers = [...room.players.values()].filter(p => p.inFantasyland);
  
  // Check if all normal players have completed 5 rounds (17 cards)
  const normalComplete = normalPlayers.every(p => p.handCardIndex >= 17);
  
  // Check if all fantasyland players have played their hand
  const fantasylandComplete = fantasylandPlayers.every(p => p.hasPlayedFantasylandHand);
  
  // Hand is complete when:
  // 1. All normal players have completed their 5 rounds, AND
  // 2. All fantasyland players have played their hand (if any exist)
  const handComplete = normalComplete && (fantasylandPlayers.length === 0 || fantasylandComplete);
  
  return handComplete;
}




