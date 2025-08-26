// debug-foul.js
// Check if foul detection is causing the scoring issue

import { validateBoard } from './src/game/scoring.js';

console.log('🔍 DEBUGGING FOUL DETECTION\n');

// Test the hands from our scoop test
const playerA = {
  top: ['As', 'Ah', 'Kd'],      // AA pair
  middle: ['Ks', 'Kh', 'Qc', 'Jd', 'Th'], // KK pair  
  bottom: ['As', 'Ah', 'Ad', 'Kc', 'Qh']  // AAA trips
};

const playerB = {
  top: ['7c', '3c', '2h'],      // high card
  middle: ['Qs', 'Qh', '8d', '7c', '6h'], // QQ pair
  bottom: ['2s', '2h', '2d', '5c', '4h']  // 222 pair
};

console.log('📊 FOUL CHECK:\n');

console.log('Player A board validation:');
const aValidation = validateBoard(playerA);
console.log(aValidation);

console.log('\nPlayer B board validation:');
const bValidation = validateBoard(playerB);
console.log(bValidation);

console.log('\n🔍 ANALYSIS:');
if (aValidation.fouled) {
  console.log('❌ Player A FOULED:', aValidation.reason);
} else {
  console.log('✅ Player A board is valid');
}

if (bValidation.fouled) {
  console.log('❌ Player B FOULED:', bValidation.reason);
} else {
  console.log('✅ Player B board is valid');
}
