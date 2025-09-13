import { create } from "zustand";

// row caps
const CAPS = { top: 3, middle: 5, bottom: 5 };
const committedTotal = (b) => b.top.length + b.middle.length + b.bottom.length;
const computeTurnCap = (s) => {
  if (s.inFantasyland) {
    // In fantasyland, place 13 cards (leaving 1 in hand)
    return 13;
  }
  return (s.currentRound === 1 ? 5 : 2);
};

export const useGame = create((set, get) => ({
  userId: null,
  roomId: null,
  name: "",

  phase: "idle",
  round: null,
  currentRound: null, // Track current round within the hand
  players: [],
  isRanked: false, // Track if this is a ranked match

  board: { top: [], middle: [], bottom: [] },  // committed (locked)
  currentDeal: [],                               // last dealt (5 or 3)
  hand: [],                                      // all cards you still can place
  staged: { placements: [], discard: null },     // this-turn moves
  discards: [],                                   // all discards this hand (mine)
  reveal: null,                                   // { boards, results } at reveal
  nextRoundReady: new Set(),                     // Set of userIds ready for next round
  inFantasyland: false,                          // Whether current player is in fantasyland
  tableChips: 500,                               // Current chip balance
  gameEnd: null,                                 // Game end data when match is over
  
  // Timer state
  timer: {
    isActive: false,
    phaseType: null, // 'initial-set' | 'round' | 'fantasyland'
    deadlineEpochMs: null,
    durationMs: null,
    progress: 0 // 0-1 for UI animation
  },

  placedCountThisTurn: () => get().staged.placements.length,
  turnCap: () => computeTurnCap(get()),
  canCommit: () => {
    const state = get();
    if (state.inFantasyland) {
      // In fantasyland, can commit when 13 cards are placed (1 left in hand)
      return state.staged.placements.length === 13;
    }
    return state.staged.placements.length === computeTurnCap(state);
  },

  setName: (name) => set({ name }),
  setGameEnd: (gameEndData) => set({ gameEnd: gameEndData }),

  setPlacement: (row, card) => set((s) => {
    // block moving committed cards
    if (s.board.top.includes(card) || s.board.middle.includes(card) || s.board.bottom.includes(card)) return s;

    const cap = computeTurnCap(s);
    const without = s.staged.placements.filter(p => p.card !== card);
    if (without.length >= cap && !s.staged.placements.find(p => p.card === card)) return s;

    const committedCount = row === "top" ? s.board.top.length : row === "middle" ? s.board.middle.length : s.board.bottom.length;
    const stagedCount = without.filter(p => p.row === row).length;
    if (committedCount + stagedCount >= CAPS[row]) return s;

    return {
      ...s,
      staged: {
        placements: [...without, { row, card }],
        discard: s.staged.discard === card ? null : s.staged.discard,
      },
    };
  }),

  unstage: (card) => set((s) => ({
    ...s,
    staged: {
      placements: s.staged.placements.filter(p => p.card !== card),
      discard: s.staged.discard === card ? null : s.staged.discard,
    },
  })),

  clearStage: () => set((s) => ({ ...s, staged: { placements: [], discard: null } })),

  commitTurnLocal: (discardOverride = null) => set((s) => {
    const cap = computeTurnCap(s);
    if (s.staged.placements.length !== cap) return s;

    const nextBoard = { top: [...s.board.top], middle: [...s.board.middle], bottom: [...s.board.bottom] };
    const stagedCards = s.staged.placements.map(p => p.card);

    for (const { row, card } of s.staged.placements) {
      if (!nextBoard[row].includes(card)) nextBoard[row].push(card);
    }

    // auto-discard only after first 5 are committed (i.e., on 3-card turns)
    // No discards in fantasyland mode
    let discard = s.staged.discard;
    const isThreeCardTurn = s.currentRound > 1 && s.currentDeal.length === 3;
    console.log(`🎯 MOBILE: commitTurnLocal - isThreeCardTurn:`, isThreeCardTurn, 'currentRound:', s.currentRound, 'currentDeal.length:', s.currentDeal.length, 'inFantasyland:', s.inFantasyland);
    if (isThreeCardTurn && !s.inFantasyland) {
      if (discardOverride) {
        discard = discardOverride;
        console.log(`🎯 MOBILE: Using discardOverride:`, discardOverride);
      } else {
        const leftover = s.currentDeal.find(c => !stagedCards.includes(c));
        if (leftover) discard = leftover;
        console.log(`🎯 MOBILE: Auto-calculated leftover:`, leftover);
      }
    }
    // In fantasyland, no discards
    if (s.inFantasyland) {
      discard = null;
    }
    console.log(`🎯 MOBILE: Final discard value:`, discard);

    const committedSet = new Set([...s.board.top, ...s.board.middle, ...s.board.bottom, ...stagedCards]);
    const nextHand = s.hand.filter(c => !committedSet.has(c) && (discard ? c !== discard : true));

    const nextDiscards = discard ? [...s.discards, discard] : s.discards;

    return {
      ...s,
      board: nextBoard,
      hand: nextHand,
      currentDeal: [], // Clear currentDeal after processing
      staged: { placements: [], discard },
      discards: nextDiscards,
    };
  }),

  applyEvent: (event, data) => set((s) => {
    switch (event) {
      case "auth:ok":
        return { ...s, userId: data?.userId ?? s.userId };

      case "round:start":
        return {
          ...s,
          phase: "deal5",
          round: data.round,
          currentRound: 1, // Reset to round 1 for new hand
          players: data.players ?? s.players,
          board: { top: [], middle: [], bottom: [] },
          hand: [],
          currentDeal: [],
          staged: { placements: [], discard: null },
          discards: [],
          reveal: null,
          nextRoundReady: new Set(), // Reset next round ready state
          gameEnd: null, // Reset game end state for new hand
          // Keep fantasyland status from previous reveal (don't override here)
          inFantasyland: s.inFantasyland,
        };

      case "round:deal": {
        const incoming = Array.isArray(data?.cards) ? data.cards : [];
        if (incoming.length === 0) return s;

        const isFantasyland = data?.fantasyland ?? false;
        const round = data?.round ?? 1;
        
        console.log(`🎭 Mobile deal: ${incoming.length} cards, fantasyland=${isFantasyland}, round=${round}`);
        
        if (isFantasyland) {
          // Fantasyland mode: accept all 14 cards
          const normalized = incoming.slice(0, 14);
          
          // De-dup against board, hand, and staged placements (fantasyland appends to hand)
          const seen = new Set([
            ...s.board.top, ...s.board.middle, ...s.board.bottom,
            ...s.hand,
            ...s.staged.placements.map(p => p.card),
          ]);
          const deduped = normalized.filter(c => !seen.has(c));

          return {
            ...s,
            currentDeal: deduped,                   // all 14 fantasyland cards
            hand: [...s.hand, ...deduped],          // append all new cards
            phase: data.phase ?? s.phase,
            currentRound: round,                    // track current round
            // Keep existing fantasyland status (don't override here)
            inFantasyland: s.inFantasyland,
          };
        } else {
          // Normal mode: handle based on round number
          let want = 3; // default for rounds 2-5
          if (round === 1) {
            want = 5; // round 1 gets 5 cards
          }
          
          const normalized = incoming.slice(0, want);

          // De-dup against board and staged placements only (not hand, since we're replacing it)
          const seen = new Set([
            ...s.board.top, ...s.board.middle, ...s.board.bottom,
            ...s.staged.placements.map(p => p.card),
          ]);
          const deduped = normalized.filter(c => !seen.has(c));


          
          return {
            ...s,
            currentDeal: deduped,                   // strictly 5 or 3, without duplicates
            hand: deduped,                          // replace hand with new cards only
            phase: data.phase ?? s.phase,
            currentRound: round,                    // track current round
            // Keep existing fantasyland status (don't override here)
            inFantasyland: s.inFantasyland,
          };
        }
      }

      case "action:applied": {
        // Handle auto-commit punishment
        if (data?.autoCommitted) {
          
          
          // Ensure we have valid board data from server
          const serverBoard = data.board || { top: [], middle: [], bottom: [] };
          const serverHand = Array.isArray(data.hand) ? data.hand : [];
          const serverDiscards = Array.isArray(data.discards) ? data.discards : s.discards;
          
          return {
            ...s,
            board: {
              top: Array.isArray(serverBoard.top) ? serverBoard.top : [],
              middle: Array.isArray(serverBoard.middle) ? serverBoard.middle : [],
              bottom: Array.isArray(serverBoard.bottom) ? serverBoard.bottom : [],
            },
            hand: serverHand,
            discards: serverDiscards,
            staged: { placements: [], discard: null },
            currentDeal: [],
            // Preserve fantasyland status during auto-commit
            inFantasyland: s.inFantasyland,
          };
        }
        
        // Normal server-confirmed commit: ensure discard is removed from hand and sync discards
        const discard = data?.discard ?? null;
        const committedSet = new Set([...s.board.top, ...s.board.middle, ...s.board.bottom]);
        const nextHand = s.hand
          .filter(c => !committedSet.has(c))
          .filter(c => c !== discard);
        return {
          ...s,
          hand: nextHand,
          staged: { placements: [], discard: discard ?? s.staged.discard },
          currentDeal: [],
          discards: Array.isArray(data?.discards) ? data.discards : s.discards,
        };
      }

      case "round:reveal":
        // Check if this player qualifies for fantasyland next hand
        const meId = s.userId;
        const fantasylandData = data?.fantasyland || [];
        const myFantasylandData = fantasylandData.find(f => f.userId === meId);
        const willBeInFantasyland = myFantasylandData?.qualified || false;
        
        console.log('🎯 round:reveal - meId:', meId, 'fantasylandData:', fantasylandData, 'myFantasylandData:', myFantasylandData, 'willBeInFantasyland:', willBeInFantasyland);
        
        return {
          ...s,
          staged: { placements: [], discard: data?.discard ?? s.staged.discard },
          reveal: { 
            boards: data?.boards || [], 
            results: data?.results || {},
            fantasyland: data?.fantasyland || []
          },
          nextRoundReady: new Set(), // Reset next round ready state
          // Set fantasyland status for next hand
          inFantasyland: willBeInFantasyland,
        };

      case "round:next-ready":
        return {
          ...s,
          nextRoundReady: new Set(data?.readyPlayers || []),
        };

      case "timer:start":
        return {
          ...s,
          timer: {
            isActive: true,
            phaseType: data?.phaseType || null,
            deadlineEpochMs: data?.deadlineEpochMs || null,
            durationMs: data?.durationMs || null,
            progress: 0
          }
        };

      case "timer:expired":
        return {
          ...s,
          timer: {
            isActive: false,
            phaseType: null,
            deadlineEpochMs: null,
            durationMs: null,
            progress: 1
          }
        };

      case "timer:update":
        return {
          ...s,
          timer: {
            ...s.timer,
            progress: data?.progress ?? s.timer.progress,
            timeLeft: data?.timeLeft ?? s.timer.timeLeft,
          }
        };

      case "game:end":
        return {
          ...s,
          gameEnd: {
            winner: data?.winner || null,
            loser: data?.loser || null,
            finalChips: data?.finalChips || []
          }
        };

      case "room:state":
        return {
          ...s,
          roomId: data.roomId ?? s.roomId,
          phase: data.phase ?? s.phase,
          round: data.round ?? s.round,
          players: Array.isArray(data.players) ? data.players : s.players,
          isRanked: data.isRanked ?? s.isRanked,
        };

      case "player:state":
        // Update local player state with full board and hand data
        if (data.userId === s.userId) {
          return {
            ...s,
            board: {
              top: Array.isArray(data.board?.top) ? data.board.top : s.board.top,
              middle: Array.isArray(data.board?.middle) ? data.board.middle : s.board.middle,
              bottom: Array.isArray(data.board?.bottom) ? data.board.bottom : s.board.bottom,
            },
            hand: Array.isArray(data.hand) ? data.hand : s.hand,
            discards: Array.isArray(data.discards) ? data.discards : s.discards,
            currentDeal: Array.isArray(data.currentDeal) ? data.currentDeal : s.currentDeal,
            score: data.score ?? s.score,
            ready: data.ready ?? s.ready,
            inFantasyland: data.inFantasyland ?? s.inFantasyland,
            roundComplete: data.roundComplete ?? s.roundComplete,
            tableChips: data.tableChips ?? s.tableChips,
          };
        }
        return s;

      case "round:end":
        return { ...s, phase: "idle" };

      default:
        return s;
    }
  }),
}));
