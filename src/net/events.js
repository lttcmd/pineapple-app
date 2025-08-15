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
  REVEAL_BOARD: "action:reveal-board",
  READY_NEXT_ROUND: "action:ready-next-round",

  // Timer events
  TIMER_START: "timer:start",
  TIMER_UPDATE: "timer:update",
  TIMER_STOP: "timer:stop",

  ERROR: "error:msg",
  CHAT: "chat:msg"
};
