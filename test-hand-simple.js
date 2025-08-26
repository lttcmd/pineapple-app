// test-hand-simple.js
// Simplified test for the specific hand scenario

import { settlePairwiseDetailed } from './src/game/scoring.js';

console.log('🎯 TESTING HAND SCENARIO\n');

// Define the test hands
const playerA = {
  name: 'Player A',
  board: {
    top: ['7s', '7h', '8d'],
    middle: ['Ks', 'Kh', 'Jc', 'Td', 'Th'],
    bottom: ['As', 'Ah', 'Ad', 'Qc', '2h']
  }
};

const playerB = {
  name: 'Player B', 
  board: {
    top: ['Ac', '3c', '2h'],
    middle: ['Qs', 'Qh', 'Qd', '9c', '8h'],
    bottom: ['5s', '5h', '5d', '6c', '6h']
  }
};

console.log('📊 HAND SETUP:');
console.log(`${playerA.name}:`);
console.log(`  Top: [${playerA.board.top.join(', ')}] - 77 pair`);
console.log(`  Middle: [${playerA.board.middle.join(', ')}] - KK, TT two pair`);
console.log(`  Bottom: [${playerA.board.bottom.join(', ')}] - AAA trips`);
console.log();

console.log(`${playerB.name}:`);
console.log(`  Top: [${playerB.board.top.join(', ')}] - high card`);
console.log(`  Middle: [${playerB.board.middle.join(', ')}] - QQQ trips`);
console.log(`  Bottom: [${playerB.board.bottom.join(', ')}] - 555, 66 full house`);
console.log();

// Run the scoring system
console.log('🎯 SCORING BREAKDOWN:');
console.log('Note: Row wins/losses are separate from royalties. Royalties are bonus points for strong hands.');
console.log('Row scoring: +1 for winning a row, 0 for losing a row, 0 for tie.');
console.log();

const result = settlePairwiseDetailed(playerA.board, playerB.board);

console.log(`${playerA.name} Results:`);
console.log(`  Top row: ${result.a.lines.top > 0 ? '+' : ''}${result.a.lines.top} for winning row | +${result.a.royaltiesBreakdown.top} royalty bonus for 77 pair`);
console.log(`  Middle row: ${result.a.lines.middle > 0 ? '+' : ''}${result.a.lines.middle} for losing row | +${result.a.royaltiesBreakdown.middle} royalty bonus (no bonus for two pair)`);
console.log(`  Bottom row: ${result.a.lines.bottom > 0 ? '+' : ''}${result.a.lines.bottom} for losing row | +${result.a.royaltiesBreakdown.bottom} royalty bonus (no bonus for trips in bottom)`);
console.log(`  Scoop bonus: ${result.a.scoop > 0 ? '+' : ''}${result.a.scoop}`);
console.log(`  TOTAL: ${result.a.total > 0 ? '+' : ''}${result.a.total}`);

console.log(`\n${playerB.name} Results:`);
console.log(`  Top row: ${result.b.lines.top > 0 ? '+' : ''}${result.b.lines.top} for losing row | +${result.b.royaltiesBreakdown.top} royalty bonus (no bonus for high card)`);
console.log(`  Middle row: ${result.b.lines.middle > 0 ? '+' : ''}${result.b.lines.middle} for winning row | +${result.b.royaltiesBreakdown.middle} royalty bonus for QQQ trips`);
console.log(`  Bottom row: ${result.b.lines.bottom > 0 ? '+' : ''}${result.b.lines.bottom} for winning row | +${result.b.royaltiesBreakdown.bottom} royalty bonus for full house`);
console.log(`  Scoop bonus: ${result.b.scoop > 0 ? '+' : ''}${result.b.scoop}`);
console.log(`  TOTAL: ${result.b.total > 0 ? '+' : ''}${result.b.total}`);

console.log(`\n🏆 FINAL RESULT:`);
const pointDiff = result.a.total - result.b.total;
console.log(`  Point difference: ${pointDiff} (${result.a.total > result.b.total ? playerA.name : playerB.name} wins)`);
console.log(`  Chip exchange: ${Math.abs(pointDiff) * 10} chips`);

console.log('\n✅ Test completed!');
