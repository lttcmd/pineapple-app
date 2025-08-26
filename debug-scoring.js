// debug-scoring.js
// Debug the scoring logic step by step

import { settlePairwiseDetailed } from './src/game/scoring.js';
import { rankTop3, rank5, compareTop3, compare5 } from './src/game/evaluator.js';

console.log('🔍 DEBUGGING SCORING LOGIC\n');

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

console.log('📊 STEP-BY-STEP ANALYSIS:\n');

// Step 1: Compare hands
console.log('1️⃣ HAND COMPARISONS:');
const tCmp = compareTop3(rankTop3(playerA.top), rankTop3(playerB.top));
const mCmp = compare5(rank5(playerA.middle), rank5(playerB.middle));
const bCmp = compare5(rank5(playerA.bottom), rank5(playerB.bottom));

console.log(`Top: ${tCmp} (${tCmp > 0 ? 'A wins' : tCmp < 0 ? 'B wins' : 'tie'})`);
console.log(`Middle: ${mCmp} (${mCmp > 0 ? 'A wins' : mCmp < 0 ? 'B wins' : 'tie'})`);
console.log(`Bottom: ${bCmp} (${bCmp > 0 ? 'A wins' : bCmp < 0 ? 'B wins' : 'tie'})`);

// Step 2: Calculate row wins
console.log('\n2️⃣ ROW WINS:');
const rowWin = 1;
let aTopWin = 0, bTopWin = 0;
let aMidWin = 0, bMidWin = 0;
let aBotWin = 0, bBotWin = 0;

if (tCmp > 0) { aTopWin = rowWin; bTopWin = 0; }
else if (tCmp < 0) { aTopWin = 0; bTopWin = rowWin; }

if (mCmp > 0) { aMidWin = rowWin; bMidWin = 0; }
else if (mCmp < 0) { aMidWin = 0; bMidWin = rowWin; }

if (bCmp > 0) { aBotWin = rowWin; bBotWin = 0; }
else if (bCmp < 0) { aBotWin = 0; bBotWin = rowWin; }

console.log(`A wins: Top=${aTopWin}, Middle=${aMidWin}, Bottom=${aBotWin}`);
console.log(`B wins: Top=${bTopWin}, Middle=${bMidWin}, Bottom=${bBotWin}`);

// Step 3: Scoop bonus
console.log('\n3️⃣ SCOOP BONUS:');
const scoopBonus = 3;
const winsA = [tCmp, mCmp, bCmp].every(x => x > 0);
const winsB = [tCmp, mCmp, bCmp].every(x => x < 0);
const aScoop = winsA ? scoopBonus : 0;
const bScoop = winsB ? scoopBonus : 0;

console.log(`A scoop: ${aScoop} (${winsA ? 'YES' : 'NO'})`);
console.log(`B scoop: ${bScoop} (${winsB ? 'YES' : 'NO'})`);

// Step 4: Royalties
console.log('\n4️⃣ ROYALTIES:');
// We'll use the actual scoring function for this
const result = settlePairwiseDetailed(playerA, playerB);
console.log(`A royalties: ${result.a.royalties} (${JSON.stringify(result.a.royaltiesBreakdown)})`);
console.log(`B royalties: ${result.b.royalties} (${JSON.stringify(result.b.royaltiesBreakdown)})`);

// Step 5: Final totals
console.log('\n5️⃣ FINAL TOTALS:');
console.log(`A total: ${result.a.total} (wins: ${aTopWin + aMidWin + aBotWin} + scoop: ${aScoop} + royalties: ${result.a.royalties})`);
console.log(`B total: ${result.b.total} (wins: ${bTopWin + bMidWin + bBotWin} + scoop: ${bScoop} + royalties: ${result.b.royalties})`);

console.log('\n🔍 COMPARISON WITH ACTUAL RESULT:');
console.log(`Expected A wins: ${aTopWin + aMidWin + aBotWin}, Actual: ${result.a.lines.top + result.a.lines.middle + result.a.lines.bottom}`);
console.log(`Expected B wins: ${bTopWin + bMidWin + bBotWin}, Actual: ${result.b.lines.top + result.b.lines.middle + result.b.lines.bottom}`);
console.log(`Expected A scoop: ${aScoop}, Actual: ${result.a.scoop}`);
console.log(`Expected B scoop: ${bScoop}, Actual: ${result.b.scoop}`);
