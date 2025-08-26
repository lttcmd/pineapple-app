// debug-hands.js
// Debug hand evaluation logic

import { rankTop3, rank5, compareTop3, compare5 } from './src/game/evaluator.js';

console.log('🔍 DEBUGGING HAND EVALUATION\n');

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

console.log('📊 HAND ANALYSIS:');

// Top row comparison
console.log('\n🔝 TOP ROW:');
const aTop = rankTop3(playerA.top);
const bTop = rankTop3(playerB.top);
console.log(`Player A: ${playerA.top.join(', ')} → ${JSON.stringify(aTop)}`);
console.log(`Player B: ${playerB.top.join(', ')} → ${JSON.stringify(bTop)}`);
const topCmp = compareTop3(aTop, bTop);
console.log(`Comparison: ${topCmp} (${topCmp > 0 ? 'A wins' : topCmp < 0 ? 'B wins' : 'tie'})`);

// Middle row comparison  
console.log('\n🔝 MIDDLE ROW:');
const aMid = rank5(playerA.middle);
const bMid = rank5(playerB.middle);
console.log(`Player A: ${playerA.middle.join(', ')} → ${JSON.stringify(aMid)}`);
console.log(`Player B: ${playerB.middle.join(', ')} → ${JSON.stringify(bMid)}`);
const midCmp = compare5(aMid, bMid);
console.log(`Comparison: ${midCmp} (${midCmp > 0 ? 'A wins' : midCmp < 0 ? 'B wins' : 'tie'})`);

// Bottom row comparison
console.log('\n🔝 BOTTOM ROW:');
const aBot = rank5(playerA.bottom);
const bBot = rank5(playerB.bottom);
console.log(`Player A: ${playerA.bottom.join(', ')} → ${JSON.stringify(aBot)}`);
console.log(`Player B: ${playerB.bottom.join(', ')} → ${JSON.stringify(bBot)}`);
const botCmp = compare5(aBot, bBot);
console.log(`Comparison: ${botCmp} (${botCmp > 0 ? 'A wins' : botCmp < 0 ? 'B wins' : 'tie'})`);

console.log('\n🏆 SUMMARY:');
console.log(`Top: ${topCmp > 0 ? 'A wins' : topCmp < 0 ? 'B wins' : 'tie'}`);
console.log(`Middle: ${midCmp > 0 ? 'A wins' : midCmp < 0 ? 'B wins' : 'tie'}`);
console.log(`Bottom: ${botCmp > 0 ? 'A wins' : botCmp < 0 ? 'B wins' : 'tie'}`);

const aWins = [topCmp, midCmp, botCmp].every(x => x > 0);
const bWins = [topCmp, midCmp, botCmp].every(x => x < 0);
console.log(`Scoop A: ${aWins}`);
console.log(`Scoop B: ${bWins}`);
