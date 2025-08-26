// test-hand.js
// Test specific hand scenario with detailed scoring breakdown

import { settlePairwiseDetailed } from './src/game/scoring.js';
import { rank5, rankTop3, compare5, compareTop3 } from './src/game/evaluator.js';

console.log('🎯 TESTING SPECIFIC HAND SCENARIO\n');

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
console.log(`  Top: [${playerA.board.top.join(', ')}]`);
console.log(`  Middle: [${playerA.board.middle.join(', ')}]`);
console.log(`  Bottom: [${playerA.board.bottom.join(', ')}]`);
console.log();

console.log(`${playerB.name}:`);
console.log(`  Top: [${playerB.board.top.join(', ')}]`);
console.log(`  Middle: [${playerB.board.middle.join(', ')}]`);
console.log(`  Bottom: [${playerB.board.bottom.join(', ')}]`);
console.log();

// Evaluate each row individually
console.log('🔍 ROW-BY-ROW EVALUATION:');

// Top row evaluation
const aTop = rankTop3(playerA.board.top);
const bTop = rankTop3(playerB.board.top);
const topCmp = compareTop3(aTop, bTop);

console.log(`\n📈 TOP ROW (3 cards):`);
console.log(`  ${playerA.name}: ${aTop.cat === 2 ? 'Trips' : aTop.cat === 1 ? 'Pair' : 'High'} - ${playerA.board.top.join(', ')}`);
console.log(`  ${playerB.name}: ${bTop.cat === 2 ? 'Trips' : bTop.cat === 1 ? 'Pair' : 'High'} - ${playerB.board.top.join(', ')}`);
console.log(`  Result: ${topCmp > 0 ? playerA.name + ' wins' : topCmp < 0 ? playerB.name + ' wins' : 'Tie'}`);

// Middle row evaluation
const aMiddle = rank5(playerA.board.middle);
const bMiddle = rank5(playerB.board.middle);
const middleCmp = compare5(aMiddle, bMiddle);

console.log(`\n📈 MIDDLE ROW (5 cards):`);
console.log(`  ${playerA.name}: ${getHandName(aMiddle.cat)} - ${playerA.board.middle.join(', ')}`);
console.log(`  ${playerB.name}: ${getHandName(bMiddle.cat)} - ${playerB.board.middle.join(', ')}`);
console.log(`  Result: ${middleCmp > 0 ? playerA.name + ' wins' : middleCmp < 0 ? playerB.name + ' wins' : 'Tie'}`);

// Bottom row evaluation
const aBottom = rank5(playerA.board.bottom);
const bBottom = rank5(playerB.board.bottom);
const bottomCmp = compare5(aBottom, bBottom);

console.log(`\n📈 BOTTOM ROW (5 cards):`);
console.log(`  ${playerA.name}: ${getHandName(aBottom.cat)} - ${playerA.board.bottom.join(', ')}`);
console.log(`  ${playerB.name}: ${getHandName(bBottom.cat)} - ${playerB.board.bottom.join(', ')}`);
console.log(`  Result: ${bottomCmp > 0 ? playerA.name + ' wins' : bottomCmp < 0 ? playerB.name + ' wins' : 'Tie'}`);

// Run the full scoring system
console.log('\n🎯 FULL SCORING BREAKDOWN:');
const result = settlePairwiseDetailed(playerA.board, playerB.board);

console.log(`\n${playerA.name} Results:`);
console.log(`  Top row: ${result.a.lines.top > 0 ? '+' : ''}${result.a.lines.top}`);
console.log(`  Middle row: ${result.a.lines.middle > 0 ? '+' : ''}${result.a.lines.middle}`);
console.log(`  Bottom row: ${result.a.lines.bottom > 0 ? '+' : ''}${result.a.lines.bottom}`);
console.log(`  Scoop bonus: ${result.a.scoop > 0 ? '+' : ''}${result.a.scoop}`);
console.log(`  Royalties: ${result.a.royalties > 0 ? '+' : ''}${result.a.royalties}`);
console.log(`  Royalties breakdown: Top=${result.a.royaltiesBreakdown.top}, Middle=${result.a.royaltiesBreakdown.middle}, Bottom=${result.a.royaltiesBreakdown.bottom}`);
console.log(`  TOTAL: ${result.a.total > 0 ? '+' : ''}${result.a.total}`);

console.log(`\n${playerB.name} Results:`);
console.log(`  Top row: ${result.b.lines.top > 0 ? '+' : ''}${result.b.lines.top}`);
console.log(`  Middle row: ${result.b.lines.middle > 0 ? '+' : ''}${result.b.lines.middle}`);
console.log(`  Bottom row: ${result.b.lines.bottom > 0 ? '+' : ''}${result.b.lines.bottom}`);
console.log(`  Scoop bonus: ${result.b.scoop > 0 ? '+' : ''}${result.b.scoop}`);
console.log(`  Royalties: ${result.b.royalties > 0 ? '+' : ''}${result.b.royalties}`);
console.log(`  Royalties breakdown: Top=${result.b.royaltiesBreakdown.top}, Middle=${result.b.royaltiesBreakdown.middle}, Bottom=${result.b.royaltiesBreakdown.bottom}`);
console.log(`  TOTAL: ${result.b.total > 0 ? '+' : ''}${result.b.total}`);

console.log(`\n🏆 FINAL RESULT:`);
console.log(`  Point difference: ${result.a.total - result.b.total} (${result.a.total > result.b.total ? playerA.name : playerB.name} wins)`);
console.log(`  Chip exchange: ${Math.abs(result.a.total - result.b.total) * 10} chips`);

// Helper function to get hand names
function getHandName(cat) {
  const names = [
    'High Card', 'Pair', 'Two Pair', 'Trips', 'Straight', 'Flush', 
    'Full House', 'Quads', 'Straight Flush', 'Royal Flush'
  ];
  return names[cat] || 'Unknown';
}

console.log('\n✅ Test completed!');
