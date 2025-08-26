// test-scoop.js
// Test for scoop bonus scenario

import { settlePairwiseDetailed } from './src/game/scoring.js';

console.log('🎯 TESTING SCOOP BONUS SCENARIO\n');

// Define a test hand where Player A wins all three rows (should get scoop bonus +3)
// Fixed: middle must be stronger than top, bottom must be stronger than middle
const playerA = {
  name: 'Player A',
  board: {
    top: ['7s', '7h', '8d'],      // 77 pair (weaker than middle)
    middle: ['Ks', 'Kh', 'Qc', 'Jd', 'Th'], // KK pair (stronger than top)
    bottom: ['As', 'Ah', 'Ad', 'Kc', 'Qh']  // AAA trips (stronger than middle)
  }
};

const playerB = {
  name: 'Player B', 
  board: {
    top: ['3c', '3h', '2h'],      // 33 pair (weaker than middle)
    middle: ['Qs', 'Qh', '8d', '7c', '6h'], // QQ pair (stronger than top)
    bottom: ['2s', '2h', '2d', '5c', '4h']  // 222 pair (stronger than middle)
  }
};

console.log('📊 HAND SETUP:');
console.log(`${playerA.name}:`);
console.log(`  Top: [${playerA.board.top.join(', ')}] - 77 pair`);
console.log(`  Middle: [${playerA.board.middle.join(', ')}] - KK pair`);
console.log(`  Bottom: [${playerA.board.bottom.join(', ')}] - AAA trips`);
console.log();

console.log(`${playerB.name}:`);
console.log(`  Top: [${playerB.board.top.join(', ')}] - 33 pair`);
console.log(`  Middle: [${playerB.board.middle.join(', ')}] - QQ pair`);
console.log(`  Bottom: [${playerB.board.bottom.join(', ')}] - 222 pair`);
console.log();

// Run the scoring system
console.log('🎯 SCORING BREAKDOWN:');
console.log('Note: Row wins/losses are separate from royalties. Royalties are bonus points for strong hands.');
console.log('Row scoring: +1 for winning a row, 0 for losing a row, 0 for tie.');
console.log('Scoop bonus: +3 for winning all three rows.');
console.log();

const result = settlePairwiseDetailed(playerA.board, playerB.board);

console.log(`${playerA.name} Results:`);
console.log(`  Top row: ${result.a.lines.top > 0 ? '+' : ''}${result.a.lines.top} for winning row | +${result.a.royaltiesBreakdown.top} royalty bonus for 77 pair`);
console.log(`  Middle row: ${result.a.lines.middle > 0 ? '+' : ''}${result.a.lines.middle} for winning row | +${result.a.royaltiesBreakdown.middle} royalty bonus for KK pair`);
console.log(`  Bottom row: ${result.a.lines.bottom > 0 ? '+' : ''}${result.a.lines.bottom} for winning row | +${result.a.royaltiesBreakdown.bottom} royalty bonus for AAA trips`);
console.log(`  Scoop bonus: ${result.a.scoop > 0 ? '+' : ''}${result.a.scoop} (won all 3 rows!)`);
console.log(`  TOTAL: ${result.a.total > 0 ? '+' : ''}${result.a.total}`);

console.log(`\n${playerB.name} Results:`);
console.log(`  Top row: ${result.b.lines.top > 0 ? '+' : ''}${result.b.lines.top} for losing row | +${result.b.royaltiesBreakdown.top} royalty bonus for 33 pair`);
console.log(`  Middle row: ${result.b.lines.middle > 0 ? '+' : ''}${result.b.lines.middle} for losing row | +${result.b.royaltiesBreakdown.middle} royalty bonus for QQ pair`);
console.log(`  Bottom row: ${result.b.lines.bottom > 0 ? '+' : ''}${result.b.lines.bottom} for losing row | +${result.b.royaltiesBreakdown.bottom} royalty bonus for 222 pair`);
console.log(`  Scoop bonus: ${result.b.scoop > 0 ? '+' : ''}${result.b.scoop}`);
console.log(`  TOTAL: ${result.b.total > 0 ? '+' : ''}${result.b.total}`);

console.log(`\n🏆 FINAL RESULT:`);
const pointDiff = result.a.total - result.b.total;
console.log(`  Point difference: ${pointDiff} (${result.a.total > result.b.total ? playerA.name : playerB.name} wins)`);
console.log(`  Chip exchange: ${Math.abs(pointDiff) * 10} chips`);

console.log('\n✅ Test completed!');
