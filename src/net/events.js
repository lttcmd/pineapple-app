export const Events = {
  AUTH_OK: "auth:ok",
  CREATE_ROOM: "room:create",
  JOIN_ROOM: "room:join",
  LEAVE_ROOM: "room:leave",
  ROOM_STATE: "room:state",

  START_ROUND: "round:start",
  DEAL_BATCH: "round:deal",
  PLACE: "action:place",
  DISCARD: "action:discard",
  READY: "action:ready",
  ACTION_APPLIED: "action:applied",
  REVEAL: "round:reveal",
  NEXT_ROUND_READY_UPDATE: "round:next-ready",
  TIMER_SYNC: "timer:sync",

  // Ranked matchmaking events
  SEARCH_RANKED: "ranked:search",
  CANCEL_SEARCH: "ranked:cancel",
  MATCH_FOUND: "ranked:match-found",
  SEARCHING_STATUS: "ranked:searching",

  ERROR: "error:msg",
  CHAT: "chat:msg"
};
