// src/game/constants.js
// Shared constants for OFC Pineapple tournament

/**
 * Chip conversion constants
 * These should be consistent across server, mobile, and web clients
 */
export const CHIP_CONSTANTS = {
  POINTS_PER_CHIP: 10,        // 1 point = 10 chips
  STARTING_CHIPS: 500,        // Each player starts with 500 chips
  TOTAL_TABLE_CHIPS: 1000,    // Total chips on table always equals 1000
  WIN_THRESHOLD: 1000,        // Player wins when they reach 1000 chips
  LOSE_THRESHOLD: 0           // Player loses when they reach 0 chips
};

/**
 * Game constants
 */
export const GAME_CONSTANTS = {
  MAX_PLAYERS: 5,
  MIN_PLAYERS: 2,
  ROUNDS_PER_HAND: 4,
  CARDS_PER_ROUND: 3,
  PLACE_COUNT_PER_ROUND: 2,
  INITIAL_SET_COUNT: 5
};

/**
 * Scoring constants
 */
export const SCORING_CONSTANTS = {
  ROW_WIN: 1,                 // Points for winning a row
  SCOOP_BONUS: 3,             // Bonus points for winning all 3 rows
  FOUL_PENALTY: 6,            // Penalty for fouling (not used in current logic)
  PUSHES_ALLOWED: true        // Whether pushes (ties) are allowed
};

/**
 * Timer constants
 */
export const TIMER_CONSTANTS = {
  INITIAL_SET: 20000,         // 20 seconds for initial set
  FANTASYLAND: 50000,         // 50 seconds for fantasyland
  REVEAL: 20000               // 20 seconds for reveal phase
};
