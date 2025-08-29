// src/game/scoring.js
// Full OFC Pineapple scoring: fouls, row wins, scoop bonus, royalties.

import rules from "./rules.js";
import { rank5, rankTop3, compare5, compareTop3, isRoyalFlush } from "./evaluator.js";

const RANKS = "23456789TJQKA";
const RVAL = Object.fromEntries([...RANKS].map((r, i) => [r, i]));

/* ---------- helpers ---------- */

function rankCounts(cards) {
  const m = new Map();
  for (const c of cards) {
    if (!c || typeof c !== 'string' || c.length < 1) continue;
    const r = c[0];
    m.set(r, (m.get(r) || 0) + 1);
  }
  return m;
}

/** From a 5-card hand, compute the best possible 3-card "top" (trips > pair > high). */
function bestTopFromFive(cards) {
  const counts = rankCounts(cards);

  // Trips possible?
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const r = RANKS[i];
    if ((counts.get(r) || 0) >= 3) {
      // build any 3 with that rank (suits irrelevant to rankTop3)
      return rankTop3([r + "s", r + "h", r + "d"]);
    }
  }

  // Best pair + best kicker
  let pairRank = null;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const r = RANKS[i];
    if ((counts.get(r) || 0) >= 2) { pairRank = r; break; }
  }
  if (pairRank) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
      const k = RANKS[i];
      if (k !== pairRank && (counts.get(k) || 0) >= 1) {
        return rankTop3([pairRank + "s", pairRank + "h", k + "d"]);
      }
    }
  }

  // Otherwise 3 highest distinct ranks
  const uniq = [...new Set(cards.map(c => c[0]))]
    .sort((a, b) => RVAL[b] - RVAL[a])
    .slice(0, 3);
  return rankTop3([uniq[0] + "s", uniq[1] + "h", uniq[2] + "d"]);
}

/* ---------- validation (fouls) ---------- */

export function validateBoard(board) {
  console.log(`🔍 validateBoard called with:`, board);
  if (!board || !board.top || !board.middle || !board.bottom) {
    console.log(`🚨 Invalid board structure:`, board);
    return { fouled: true, reason: "invalid board structure" };
  }
  const { top, middle, bottom } = board;
  if (!Array.isArray(top) || !Array.isArray(middle) || !Array.isArray(bottom) ||
      top.length !== 3 || middle.length !== 5 || bottom.length !== 5) {
    console.log(`🚨 Wrong counts: top=${top?.length}, middle=${middle?.length}, bottom=${bottom?.length}`);
    return { fouled: true, reason: "wrong counts" };
  }
  
  // Check for invalid cards
  if (top.some(c => !c || typeof c !== 'string' || c.length < 2) ||
      middle.some(c => !c || typeof c !== 'string' || c.length < 2) ||
      bottom.some(c => !c || typeof c !== 'string' || c.length < 2)) {
    console.log(`🚨 INVALID CARDS DETECTED in validateBoard:`);
    console.log(`  Top:`, top);
    console.log(`  Middle:`, middle);
    console.log(`  Bottom:`, bottom);
    return { fouled: true, reason: "invalid cards" };
  }

  const m5 = rank5(middle);
  const b5 = rank5(bottom);

  // bottom must be >= middle (both 5-card hands)
  if (compare5(b5, m5) < 0) return { fouled: true, reason: "bottom < middle" };

  // middle must be >= top (5-card vs 3-card comparison)
  // Since top can only be high card, pair, or trips, we need to compare appropriately
  const t3 = rankTop3(top);
  
  // If middle is a strong 5-card hand (full house or better), it's definitely stronger than any 3-card hand
  if (m5.cat >= 6) return { fouled: false };
  
  // If middle is a straight or flush, it's stronger than any 3-card hand
  if (m5.cat >= 4) return { fouled: false };
  
  // If middle is trips, compare with top
  if (m5.cat === 3) {
    // Middle has trips, top can be high card, pair, or trips
    if (t3.cat === 2) { // Top has trips
      // Compare the trip ranks
      if (t3.key[0] > m5.key[0]) {
        return { fouled: true, reason: "top trips > middle trips" };
      }
    }
    // If top has pair or high card, middle trips wins
    return { fouled: false };
  }
  
  // If middle is two pair, compare with top
  if (m5.cat === 2) {
    if (t3.cat === 2) { // Top has trips
      return { fouled: true, reason: "top trips > middle two pair" };
    }
    if (t3.cat === 1) { // Top has pair
      // Compare pair ranks - middle two pair should be stronger than top pair
      // But we need to be careful about the comparison
      // For now, allow pairs in top with two pair in middle
      return { fouled: false };
    }
    return { fouled: false };
  }
  
  // If middle is one pair, compare with top
  if (m5.cat === 1) {
    if (t3.cat === 2) { // Top has trips
      return { fouled: true, reason: "top trips > middle pair" };
    }
    if (t3.cat === 1) { // Top has pair
      // Compare pair ranks
      if (t3.key[0] > m5.key[0]) {
        return { fouled: true, reason: "top pair > middle pair" };
      }
    }
    return { fouled: false };
  }
  
  // If middle is high card, compare with top
  if (m5.cat === 0) {
    if (t3.cat >= 1) { // Top has pair or trips
      return { fouled: true, reason: "top pair/trips > middle high card" };
    }
    // Both high card - compare highest cards
    if (t3.key[0] > m5.key[0]) {
      return { fouled: true, reason: "top high card > middle high card" };
    }
  }

  return { fouled: false };

  return { fouled: false };
}

/* ---------- royalties ---------- */

function royaltiesFive(cards, lineKey /* 'middle' | 'bottom' */) {
  const table = rules.royalties?.[lineKey] || {};
  const r = rank5(cards);

  if (r.cat === 8) { // straight flush (maybe royal)
    return isRoyalFlush(cards)
      ? (table.royal_flush || 0)
      : (table.straight_flush || 0);
  }
  if (r.cat === 7) return table.quads || 0;
  if (r.cat === 6) return table.full_house || 0;
  if (r.cat === 5) return table.flush || 0;
  if (r.cat === 4) return table.straight || 0;
  if (r.cat === 3) return table.trips || 0; // some rules pay trips in middle

  return 0;
}

function royaltiesTop(cards) {
  const tbl = rules.royalties?.top || {};
  const r = rankTop3(cards);

  if (r.cat === 2) {
    // trips e.g. 'QQQ'
    const counts = rankCounts(cards);
    const tripRank = [...counts.entries()].find(([_, c]) => c === 3)[0];
    const key = tripRank + tripRank + tripRank;
    return (tbl.trips && tbl.trips[key]) || 0;
  }

  if (r.cat === 1) {
    // pair e.g. 'QQ'
    const counts = rankCounts(cards);
    const pairRank = [...counts.entries()].find(([_, c]) => c === 2)[0];
    const key = pairRank + pairRank;
    return (tbl.pairs && tbl.pairs[key]) || 0;
  }

  return 0;
}

function totalRoyalties(board) {
  return (
    (royaltiesTop(board.top) || 0) +
    (royaltiesFive(board.middle, "middle") || 0) +
    (royaltiesFive(board.bottom, "bottom") || 0)
  );
}

/* ---------- pairwise settle ---------- */
/**
 * Returns integer points from A's perspective (A - B):
 *  - Row wins: +rowWin / 0 / -rowWin
 *  - Scoop bonus: +scoopBonus if A sweeps 3-0 (or - if B sweeps)
 *  - Royalties: (A royalties - B royalties)
 *  - Fouls:
 *      • If both foul → 0
 *      • If A fouls, B not:  -(foulPenalty) + (B royalties)
 *      • If B fouls, A not:  +(foulPenalty) + (A royalties)
 */
export function settlePairwise(aBoard, bBoard) {
  const rowWin = rules.scoring?.rowWin ?? 1;
  const scoopBonus = rules.scoring?.scoopBonus ?? 3;
  const foulPenalty = rules.scoring?.foulPenalty ?? 6;
  const pushesAllowed = rules.scoring?.pushesAllowed ?? true;

  const av = validateBoard(aBoard);
  const bv = validateBoard(bBoard);

  // Both foul
  if (av.fouled && bv.fouled) return 0;

  // One fouls: fouler gets 0, non-fouler wins all 3 rows + royalties + scoop bonus
  if (av.fouled && !bv.fouled) {
    const bRoy = totalRoyalties(bBoard);
    return (rowWin * 3) + bRoy + scoopBonus; // Non-fouler: 3 row wins + royalties + scoop
  }
  if (!av.fouled && bv.fouled) {
    const aRoy = totalRoyalties(aBoard);
    return (rowWin * 3) + aRoy + scoopBonus; // Non-fouler: 3 row wins + royalties + scoop
  }

  // Neither foul: compare rows
  let pts = 0;

  // Top (3)
  const tCmp = compareTop3(rankTop3(aBoard.top), rankTop3(bBoard.top));
  if (tCmp > 0) pts += rowWin; else if (tCmp < 0) pts -= rowWin; else if (!pushesAllowed) pts += 0;

  // Middle (5)
  const mCmp = compare5(rank5(aBoard.middle), rank5(bBoard.middle));
  if (mCmp > 0) pts += rowWin; else if (mCmp < 0) pts -= rowWin; else if (!pushesAllowed) pts += 0;

  // Bottom (5)
  const bCmp = compare5(rank5(aBoard.bottom), rank5(bBoard.bottom));
  if (bCmp > 0) pts += rowWin; else if (bCmp < 0) pts -= rowWin; else if (!pushesAllowed) pts += 0;

  // Scoop?
  const wins = [tCmp, mCmp, bCmp].map(x => (x > 0 ? 1 : x < 0 ? -1 : 0));
  if (wins.every(w => w === 1)) pts += (rules.scoring?.scoopBonus ?? 3);
  if (wins.every(w => w === -1)) pts -= (rules.scoring?.scoopBonus ?? 3);

  // Royalties (net)
  pts += (totalRoyalties(aBoard) - totalRoyalties(bBoard));

  return pts;
}
export function settlePairwiseDetailed(aBoard, bBoard) {
  const rowWin = rules.scoring?.rowWin ?? 1;
  const scoopBonus = rules.scoring?.scoopBonus ?? 3;
  const foulPenalty = rules.scoring?.foulPenalty ?? 6;

  const av = validateBoard(aBoard);
  const bv = validateBoard(bBoard);

  const detail = {
    a: { total: 0, lines: { top: 0, middle: 0, bottom: 0 }, scoop: 0, royalties: 0, royaltiesBreakdown: { top: 0, middle: 0, bottom: 0 }, foul: av.fouled },
    b: { total: 0, lines: { top: 0, middle: 0, bottom: 0 }, scoop: 0, royalties: 0, royaltiesBreakdown: { top: 0, middle: 0, bottom: 0 }, foul: bv.fouled }
  };

  // Both foul → 0
  if (av.fouled && bv.fouled) return detail;

  // One fouls: fouler gets 0, non-fouler wins all 3 rows + royalties + scoop bonus
  if (av.fouled && !bv.fouled) {
    const bRoyTop = royaltiesTop(bBoard.top);
    const bRoyMid = royaltiesFive(bBoard.middle, "middle");
    const bRoyBot = royaltiesFive(bBoard.bottom, "bottom");
    const bRoy = bRoyTop + bRoyMid + bRoyBot;
    detail.b.royalties = bRoy;
    detail.b.royaltiesBreakdown = { top: bRoyTop, middle: bRoyMid, bottom: bRoyBot };
    detail.b.scoop = +scoopBonus; // award scoop for non-fouler
    
    // Non-fouler wins all rows (+1 each) plus gets royalties
    detail.b.lines.top = +rowWin;
    detail.b.lines.middle = +rowWin;
    detail.b.lines.bottom = +rowWin;
    
    detail.a.total = 0;      // Fouler gets 0 points
    detail.b.total = (rowWin * 3) + bRoy + detail.b.scoop; // Non-fouler: 3 row wins + royalties + scoop
    return detail;
  }
  if (!av.fouled && bv.fouled) {
    const aRoyTop = royaltiesTop(aBoard.top);
    const aRoyMid = royaltiesFive(aBoard.middle, "middle");
    const aRoyBot = royaltiesFive(aBoard.bottom, "bottom");
    const aRoy = aRoyTop + aRoyMid + aRoyBot;
    detail.a.royalties = aRoy;
    detail.a.royaltiesBreakdown = { top: aRoyTop, middle: aRoyMid, bottom: aRoyBot };
    detail.a.scoop = +scoopBonus; // award scoop for non-fouler
    
    // Non-fouler wins all rows (+1 each) plus gets royalties
    detail.a.lines.top = +rowWin;
    detail.a.lines.middle = +rowWin;
    detail.a.lines.bottom = +rowWin;
    
    detail.a.total = (rowWin * 3) + aRoy + detail.a.scoop; // Non-fouler: 3 row wins + royalties + scoop
    detail.b.total = 0;      // Fouler gets 0 points
    return detail;
  }

  // Neither foul: compare rows
  const tCmp = compareTop3(rankTop3(aBoard.top),    rankTop3(bBoard.top));
  const mCmp = compare5   (rank5   (aBoard.middle), rank5   (bBoard.middle));
  const bCmp = compare5   (rank5   (aBoard.bottom), rank5   (bBoard.bottom));

  if (tCmp > 0) { detail.a.lines.top    = +rowWin; detail.b.lines.top    = 0; }
  else if (tCmp < 0) { detail.a.lines.top    = 0; detail.b.lines.top    = +rowWin; }

  if (mCmp > 0) { detail.a.lines.middle = +rowWin; detail.b.lines.middle = 0; }
  else if (mCmp < 0) { detail.a.lines.middle = 0; detail.b.lines.middle = +rowWin; }

  if (bCmp > 0) { detail.a.lines.bottom = +rowWin; detail.b.lines.bottom = 0; }
  else if (bCmp < 0) { detail.a.lines.bottom = 0; detail.b.lines.bottom = +rowWin; }

  // Scoop bonus
  const winsA = [tCmp, mCmp, bCmp].every(x => x > 0);
  const winsB = [tCmp, mCmp, bCmp].every(x => x < 0);
  if (winsA) { detail.a.scoop = +scoopBonus; detail.b.scoop = 0; }
  if (winsB) { detail.b.scoop = +scoopBonus; detail.a.scoop = 0; }

  // Royalties per row
  const aRoyTop = royaltiesTop(aBoard.top);
  const aRoyMid = royaltiesFive(aBoard.middle, "middle");
  const aRoyBot = royaltiesFive(aBoard.bottom, "bottom");
  const bRoyTop = royaltiesTop(bBoard.top);
  const bRoyMid = royaltiesFive(bBoard.middle, "middle");
  const bRoyBot = royaltiesFive(bBoard.bottom, "bottom");
  detail.a.royaltiesBreakdown = { top: aRoyTop, middle: aRoyMid, bottom: aRoyBot };
  detail.b.royaltiesBreakdown = { top: bRoyTop, middle: bRoyMid, bottom: bRoyBot };
  detail.a.royalties = aRoyTop + aRoyMid + aRoyBot;
  detail.b.royalties = bRoyTop + bRoyMid + bRoyBot;

  // Totals
  const sumLinesA = detail.a.lines.top + detail.a.lines.middle + detail.a.lines.bottom;
  const sumLinesB = detail.b.lines.top + detail.b.lines.middle + detail.b.lines.bottom;

  detail.a.total = sumLinesA + detail.a.scoop + detail.a.royalties;
  detail.b.total = sumLinesB + detail.b.scoop + detail.b.royalties;

  return detail;
}

/* ---------- fantasyland detection ---------- */

export function checkFantasylandEligibility(board, validateFouls = true) {
  if (!board || !board.top) return false;
  const { top } = board;
  if (!Array.isArray(top) || top.length !== 3) return false;
  
  // Check for invalid cards
  if (top.some(c => !c || typeof c !== 'string' || c.length < 2)) return false;
  
  // Check for QQ, KK, or AA in top
  const counts = rankCounts(top);
  const hasQQ = (counts.get('Q') || 0) >= 2;
  const hasKK = (counts.get('K') || 0) >= 2;
  const hasAA = (counts.get('A') || 0) >= 2;
  
  if (!hasQQ && !hasKK && !hasAA) return false;
  
  // Only validate fouls if requested (not during middle of game)
  if (validateFouls) {
    const validation = validateBoard(board);
    return !validation.fouled;
  }
  
  return true;
}

export function checkFantasylandContinuation(board) {
  const { top, bottom } = board;
  
  // Top: must have trips (3 of a kind)
  const topCounts = rankCounts(top);
  const hasTopTrips = [...topCounts.values()].some(count => count >= 3);
  
  // Bottom: must have quads or straight flush or royal flush
  const bottomRank = rank5(bottom);
  const hasBottomQuadsOrBetter = bottomRank.cat >= 7; // quads = 7, straight flush = 8, royal flush = 9
  
  // Stay in Fantasy Land if you have trips on top OR quads+ on bottom
  return hasTopTrips || hasBottomQuadsOrBetter;
}