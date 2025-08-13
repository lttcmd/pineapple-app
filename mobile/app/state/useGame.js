import { create } from "zustand";

// row caps
const CAPS = { top: 3, middle: 5, bottom: 5 };
const committedTotal = (b) => b.top.length + b.middle.length + b.bottom.length;
const computeTurnCap = (s) => (committedTotal(s.board) === 0 ? 5 : 2);

export const useGame = create((set, get) => ({
  userId: null,
  roomId: null,
  name: "",

  phase: "idle",
  round: null,
  players: [],

  board: { top: [], middle: [], bottom: [] },  // committed (locked)
  currentDeal: [],                               // last dealt (5 or 3)
  hand: [],                                      // all cards you still can place
  staged: { placements: [], discard: null },     // this-turn moves
  discards: [],                                   // all discards this hand (mine)
  reveal: null,                                   // { boards, results } at reveal

  placedCountThisTurn: () => get().staged.placements.length,
  turnCap: () => computeTurnCap(get()),
  canCommit: () => get().staged.placements.length === computeTurnCap(get()),

  setName: (name) => set({ name }),

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
    let discard = s.staged.discard;
    const isThreeCardTurn = committedTotal(s.board) > 0 && s.currentDeal.length === 3;
    if (isThreeCardTurn) {
      if (discardOverride) {
        discard = discardOverride;
      } else {
        const leftover = s.currentDeal.find(c => !stagedCards.includes(c));
        if (leftover) discard = leftover;
      }
    }

    const committedSet = new Set([...s.board.top, ...s.board.middle, ...s.board.bottom, ...stagedCards]);
    const nextHand = s.hand.filter(c => !committedSet.has(c) && c !== discard);

    const nextDiscards = discard ? [...s.discards, discard] : s.discards;

    return {
      ...s,
      board: nextBoard,
      hand: nextHand,
      currentDeal: [],
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
          players: data.players ?? s.players,
          board: { top: [], middle: [], bottom: [] },
          hand: [],
          currentDeal: [],
          staged: { placements: [], discard: null },
          discards: [],
          reveal: null,
        };

      case "round:deal": {
        // Normalize count: first deal 5, otherwise 3
        const incoming = Array.isArray(data?.cards) ? data.cards : [];
        if (incoming.length === 0) return s;

        const haveCommitted = committedTotal(s.board) > 0;
        const want = haveCommitted ? 3 : 5;
        const normalized = incoming.slice(0, want);

        // De-dup against anything we already hold (board + hand + staged + currentDeal)
        const seen = new Set([
          ...s.board.top, ...s.board.middle, ...s.board.bottom,
          ...s.hand,
          ...s.staged.placements.map(p => p.card),
          ...s.currentDeal,
        ]);
        const deduped = normalized.filter(c => !seen.has(c));

        return {
          ...s,
          currentDeal: deduped,                   // strictly 5 or 3, without duplicates
          hand: [...s.hand, ...deduped],          // append only new cards
          phase: data.phase ?? s.phase,
        };
      }

      case "action:applied": {
        // Handle auto-commit punishment
        if (data?.autoCommitted) {
          console.log("🎯 Mobile auto-commit: updating state with server data");
          console.log("Server board data:", data.board);
          console.log("Server hand data:", data.hand);
          console.log("Server discards data:", data.discards);
          
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
        return {
          ...s,
          staged: { placements: [], discard: data?.discard ?? s.staged.discard },
          reveal: { boards: data?.boards || [], results: data?.results || {} },
        };

      case "room:state":
        return {
          ...s,
          roomId: data.roomId ?? s.roomId,
          phase: data.phase ?? s.phase,
          round: data.round ?? s.round,
          players: Array.isArray(data.players) ? data.players : s.players,
        };

      case "round:end":
        return { ...s, phase: "idle" };

      default:
        return s;
    }
  }),
}));
