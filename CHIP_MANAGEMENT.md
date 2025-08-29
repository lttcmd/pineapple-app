# Chip Management System

## Overview

The chip management system has been centralized to eliminate duplications and ensure consistency across all platforms (server, mobile, web).

## Problem Solved

**Before**: Chip calculations were duplicated in multiple places:
- `src/game/new/GameEngine.js` - Server-side calculations
- `mobile/app/screens/Play.js` - Mobile app calculations  
- `src/web/play.html` - Web client calculations
- Test files - Manual calculations

**After**: All chip logic is centralized in one place with shared constants.

## Architecture

### 1. Shared Constants (`src/game/constants.js`)
```javascript
export const CHIP_CONSTANTS = {
  POINTS_PER_CHIP: 10,        // 1 point = 10 chips
  STARTING_CHIPS: 500,        // Each player starts with 500 chips
  TOTAL_TABLE_CHIPS: 1000,    // Total chips on table always equals 1000
  WIN_THRESHOLD: 1000,        // Player wins when they reach 1000 chips
  LOSE_THRESHOLD: 0           // Player loses when they reach 0 chips
};
```

### 2. Centralized Chip Manager (`src/game/chipManager.js`)
- `calculateChipChanges()` - Calculates points and chip changes for all players
- `applyChipChanges()` - Applies chip changes to player states
- `checkGameEndConditions()` - Checks for win/lose conditions
- `validateChipTotals()` - Validates total chips equal 1000

### 3. Server Integration (`src/game/new/GameEngine.js`)
- Uses centralized chip manager for all calculations
- Eliminates duplicate scoring logic
- Ensures consistent chip updates

### 4. Client Integration
- **Mobile**: Uses shared constants for UI calculations
- **Web**: Uses shared constants for display calculations
- **Tests**: Can import centralized functions for testing

## Key Functions

### `calculateChipChanges(players)`
```javascript
// Input: Map of playerId -> PlayerState
// Output: { results: {playerId: points}, chipChanges: {playerId: chipChange}, totalChips: number }
```

### `applyChipChanges(players, chipChanges)`
```javascript
// Input: Map of players, chip changes object
// Effect: Updates player.tableChips for all players
```

### `checkGameEndConditions(players)`
```javascript
// Input: Map of players
// Output: { winner: PlayerState, loser: PlayerState } or null
```

## Benefits

1. **Single Source of Truth**: All chip logic in one place
2. **Consistency**: Same calculations across all platforms
3. **Maintainability**: Changes only need to be made in one place
4. **Validation**: Built-in chip total validation
5. **Debugging**: Centralized logging for chip operations
6. **Testing**: Easy to test chip logic in isolation

## Usage

### Server (GameEngine)
```javascript
import { calculateChipChanges, applyChipChanges, checkGameEndConditions } from '../chipManager.js';

// Calculate and apply chip changes
const { results, chipChanges, totalChips } = calculateChipChanges(this.gameState.players);
applyChipChanges(this.gameState.players, chipChanges);

// Check for game end
const gameEndResult = checkGameEndConditions(this.gameState.players);
```

### Client (Mobile/Web)
```javascript
import { CHIP_CONSTANTS } from '../constants.js';

// Use shared constants for UI calculations
const chipDifference = scoreDifference * CHIP_CONSTANTS.POINTS_PER_CHIP;
```

## Validation

The system includes automatic validation:
- Total chips must always equal 1000
- Chip changes are logged for debugging
- Game end conditions are checked automatically
- Warnings are logged for any discrepancies

## Migration

All existing code has been updated to use the centralized system:
- ✅ GameEngine uses chipManager
- ✅ PlayerState uses shared constants
- ✅ Mobile app uses shared constants
- ✅ Web client uses shared constants
- ✅ Tests can import centralized functions

## Future Improvements

1. **Database Integration**: Chip changes could be logged to database
2. **Audit Trail**: Track all chip movements for debugging
3. **Configuration**: Make constants configurable per game type
4. **Analytics**: Track chip statistics across games
