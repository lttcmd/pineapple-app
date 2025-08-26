// src/game/rooms.js
import { id } from "../utils/ids.js";
import { mem } from "../store/mem.js";

export function getRoomById(roomId) {
  return mem.rooms.get(roomId);
}
import rules from "./rules.js";
import { createRoom, startRound, dealToAll, dealHandCards, dealNextRoundCards, allReady, allReadyForNextRound, allPlayersCompleteCurrentRound, checkHandComplete } from "./state.js";
import { Events } from "../net/events.js";
import { validateBoard, settlePairwiseDetailed, checkFantasylandEligibility, checkFantasylandContinuation } from "./scoring.js";

/** Create a new room and return its id to the creator */
export function createRoomHandler(io, socket) {
  const roomId = id(4);
  const room = createRoom(roomId);
  mem.rooms.set(roomId, room);
  socket.emit(Events.CREATE_ROOM, { roomId });
}

/** Join an existing room */
export function joinRoomHandler(io, socket, { roomId, name }) {
  const room = mem.rooms.get(roomId);
  if (!room) return socket.emit(Events.ERROR, { message: "Room not found" });
  if (room.players.size >= rules.players.max) {
    return socket.emit(Events.ERROR, { message: "Room full" });
  }

  socket.join(roomId);
  const userId = socket.user.sub;

  room.players.set(userId, {
    userId,
    name: name || ("Player-" + userId.slice(-4)),
    socketId: socket.id,
    board: { top: [], middle: [], bottom: [] },
    hand: [],
    discards: [],
    ready: false,
    currentDeal: [],
    score: 0,
    inFantasyland: false, // Initialize fantasyland status
    hasPlayedFantasylandHand: false, // Initialize fantasyland hand flag
    roundComplete: false, // Track if player has completed current round
  });

  emitRoomState(io, roomId);
}

/** Leave room */
export function leaveRoomHandler(io, socket, { roomId }) {
  const room = mem.rooms.get(roomId);
  if (!room) return;

  room.players.delete(socket.user.sub);
  socket.leave(roomId);

  if (room.players.size === 0) {
    mem.rooms.delete(roomId);
  } else {
    emitRoomState(io, roomId);
  }
}



// Handle when all players are ready
async function handleAllPlayersReady(room, io) {
  console.log(`=== HANDLE ALL PLAYERS READY ===`);
  console.log(`Room phase: ${room.phase}, currentRound: ${room.currentRound}`);

  // Check if this is mixed mode final sync before resetting ready flags
  const hasFantasylandPlayersFinal = [...room.players.values()].some(player => player.inFantasyland);
  const hasNormalPlayersFinal = [...room.players.values()].some(player => !player.inFantasyland);
  const isMixedModeFinal = hasFantasylandPlayersFinal && hasNormalPlayersFinal;
  
  // Handle normal mode transition from initial-set to round phase
  if (!isMixedModeFinal && room.phase === "initial-set") {
    console.log(`🔍 HANDLE ALL READY: Normal mode initial-set - transitioning to round phase`);
    room.phase = "round";
    room.currentRound = 2; // Move to round 2 after initial set
    
    // Deal next round of cards to all players
    const playersArr = [...room.players.values()];
    for (const player of playersArr) {
      if (!player.inFantasyland) {
        // Normal player: deal 3 cards for round 2
        const newly = dealNextRoundCards(room, player, room.currentRound);
        player.currentDeal = newly;
        player.ready = false; // Reset ready since they have new cards
        player.roundComplete = false;
        
        console.log(`🔍 HANDLE ALL READY: Normal player ${player.name} gets round ${room.currentRound}: [${newly.join(', ')}]`);
        io.to(player.socketId).emit(Events.DEAL_BATCH, { cards: newly, fantasyland: false, round: room.currentRound });
      }
    }
    
    emitRoomState(io, room.id);
    return;
  }
  
  // Handle normal mode subsequent rounds (rounds 2-5)
  if (!isMixedModeFinal && room.phase === "round") {
    const playersArr = [...room.players.values()];
    const allNormalPlayers = playersArr.filter(p => !p.inFantasyland);
    
    // Check if all normal players have completed the current round
    const allCompleted = allNormalPlayers.every(p => p.roundComplete);
    
    if (allCompleted && room.currentRound < 5) {
      console.log(`🔍 HANDLE ALL READY: Normal mode round ${room.currentRound} completed - moving to next round`);
      room.currentRound += 1;
      
      // Deal next round of cards to all normal players
      for (const player of allNormalPlayers) {
        const newly = dealNextRoundCards(room, player, room.currentRound);
        player.currentDeal = newly;
        player.ready = false; // Reset ready since they have new cards
        player.roundComplete = false;
        
        console.log(`🔍 HANDLE ALL READY: Normal player ${player.name} gets round ${room.currentRound}: [${newly.join(', ')}]`);
        io.to(player.socketId).emit(Events.DEAL_BATCH, { cards: newly, fantasyland: false, round: room.currentRound });
      }
      
      emitRoomState(io, room.id);
      return;
            } else if (allCompleted && room.currentRound >= 5) {
          console.log(`🔍 HANDLE ALL READY: Normal mode all rounds completed - proceeding to reveal`);
          // All rounds completed, proceed to reveal
          room.phase = "reveal";
          room.handComplete = true;
          
          // Process chip updates for ranked matches immediately when reveal phase starts
          if (room.isRanked) {
            console.log(`🔍 CHIP SYSTEM: Processing ranked match chip updates at reveal start`);
            // Calculate scores first
            const boards = [];
            const totals = {};
            
            for (const pl of room.players.values()) {
              boards.push({
                userId: pl.userId,
                board: pl.board,
                inFantasyland: pl.inFantasyland
              });
            }
            
            // Calculate pairwise scores
            const pairwise = [];
            for (let i = 0; i < boards.length; i++) {
              for (let j = i + 1; j < boards.length; j++) {
                const A = boards[i];
                const B = boards[j];
                const det = settlePairwiseDetailed(A.board, B.board);
                pairwise.push({
                  aUserId: A.userId,
                  bUserId: B.userId,
                  a: det.a,
                  b: det.b
                });

                if (boards.length === 2) {
                  const grossA = Math.max(det.a.lines.top, 0) + Math.max(det.a.lines.middle, 0) + Math.max(det.a.lines.bottom, 0)
                    + (det.a.scoop > 0 ? det.a.scoop : 0) + det.a.royalties;
                  const grossB = Math.max(det.b.lines.top, 0) + Math.max(det.b.lines.middle, 0) + Math.max(det.b.lines.bottom, 0)
                    + (det.b.scoop > 0 ? det.b.scoop : 0) + det.b.royalties;
                  const diff = grossA - grossB;
                  totals[A.userId] = (totals[A.userId] || 0) + diff;
                  totals[B.userId] = (totals[B.userId] || 0) - diff;
                }
              }
            }
            
            // Update chip stacks
            for (const pl of room.players.values()) {
              const delta = totals[pl.userId] || 0;
              pl.score = (pl.score || 0) + delta;
              
              // Convert points to chips and update table chips
              const chipDelta = delta * 10;
              const oldTableChips = pl.tableChips || 500;
              pl.tableChips = oldTableChips + chipDelta;
              
              console.log(`🔍 CHIP SYSTEM: Player ${pl.name}: score delta ${delta}, chip delta ${chipDelta}, table chips ${oldTableChips} → ${pl.tableChips}`);
            }
            
            // Check if match is over
            const playersArr = [...room.players.values()];
            const winner = playersArr.find(p => p.tableChips >= 1000);
            const loser = playersArr.find(p => p.tableChips <= 0);
            
            console.log(`🔍 CHIP SYSTEM: Checking match end - winner: ${winner?.name} (${winner?.tableChips} chips), loser: ${loser?.name} (${loser?.tableChips} chips)`);
            
            if (winner && loser) {
              console.log(`🔍 CHIP SYSTEM: Match ended! Winner: ${winner.name}, Loser: ${loser.name}`);
              // Match is over - update persistent chip balances
              const { updateUserChips } = await import("../store/database.js");
              await updateUserChips(winner.dbId, 500); // Winner gets +500 chips
              await updateUserChips(loser.dbId, -500);  // Loser loses -500 chips
              
              // Emit match end event
              io.to(room.id).emit(Events.MATCH_END, {
                winner: { userId: winner.userId, name: winner.name },
                loser: { userId: loser.userId, name: loser.name },
                finalChips: { winner: winner.tableChips, loser: loser.tableChips }
              });
              
              // Clean up room
              mem.rooms.delete(room.id);
              return;
            }
          }
        }
  }
  
  if (isMixedModeFinal && room.phase === "round") {
    const normalPlayer = [...room.players.values()].find(p => !p.inFantasyland);
    const fantasylandPlayer = [...room.players.values()].find(p => p.inFantasyland);
    
    if (normalPlayer && fantasylandPlayer) {
      const normalDone = normalPlayer.handCardIndex === 17 && normalPlayer.ready;
      const fantasylandDone = fantasylandPlayer.ready;
      
      console.log(`🔍 HANDLE ALL READY: Mixed mode final sync check - normalDone: ${normalDone}, fantasylandDone: ${fantasylandDone}`);
      
      if (normalDone && fantasylandDone) {
        console.log(`🔍 HANDLE ALL READY: Mixed mode final sync confirmed - proceeding to reveal`);
        // Don't reset ready flags - proceed directly to reveal
        room.phase = "reveal";
        room.handComplete = true;
        
        // Continue with reveal logic...
        const playersArr = [...room.players.values()];
        
        // Check for fantasyland eligibility and continuation
        for (const player of playersArr) {
          // Check if player should enter fantasyland (if not already in it)
          if (!player.inFantasyland && checkFantasylandEligibility(player.board, true)) {
            console.log(`Player ${player.userId} qualifies for fantasyland!`);
            player.inFantasyland = true;
            player.hasPlayedFantasylandHand = false;
          }
          
          // Check if fantasyland player should exit (if they fouled and don't qualify)
          if (player.inFantasyland && !checkFantasylandEligibility(player.board, true)) {
            console.log(`Player ${player.userId} exits fantasyland due to foul`);
            player.inFantasyland = false;
            player.hasPlayedFantasylandHand = false;
          }
          
          // Check for fantasyland continuation
          if (player.inFantasyland && player.hasPlayedFantasylandHand && checkFantasylandContinuation(player.board)) {
            console.log(`Player ${player.userId} continues in fantasyland!`);
            player.hasPlayedFantasylandHand = false;
          } else if (player.inFantasyland && player.hasPlayedFantasylandHand) {
            console.log(`Player ${player.userId} exits fantasyland`);
            player.inFantasyland = false;
            player.hasPlayedFantasylandHand = false;
          }
        }

        // Public boards summary
        const boards = playersArr.map(pl => {
          const v = validateBoard(pl.board);
          return {
            userId: pl.userId,
            name: pl.name,
            board: pl.board,
            valid: !v.fouled,
            reason: v.fouled ? v.reason : null,
            inFantasyland: pl.inFantasyland
          };
        });

        // Pairwise detailed settle
        const totals = {};
        const pairwise = [];
        for (let i = 0; i < playersArr.length; i++) {
          for (let j = i + 1; j < playersArr.length; j++) {
            const A = playersArr[i], B = playersArr[j];
            const det = settlePairwiseDetailed(A.board, B.board);
            pairwise.push({
              aUserId: A.userId,
              bUserId: B.userId,
              a: det.a,
              b: det.b
            });

            if (playersArr.length === 2) {
              const grossA = Math.max(det.a.lines.top, 0) + Math.max(det.a.lines.middle, 0) + Math.max(det.a.lines.bottom, 0)
                + (det.a.scoop > 0 ? det.a.scoop : 0) + det.a.royalties;
              const grossB = Math.max(det.b.lines.top, 0) + Math.max(det.b.lines.middle, 0) + Math.max(det.b.lines.bottom, 0)
                + (det.b.scoop > 0 ? det.b.scoop : 0) + det.b.royalties;
              const diff = grossA - grossB;
              totals[A.userId] = (totals[A.userId] || 0) + diff;
              totals[B.userId] = (totals[B.userId] || 0) - diff;
            } else {
              totals[A.userId] = (totals[A.userId] || 0) + det.a.total;
              totals[B.userId] = (totals[B.userId] || 0) + det.b.total;
            }
          }
        }

        // For non-ranked matches, just update scores normally
        if (!room.isRanked) {
          for (const pl of room.players.values()) {
            const delta = totals[pl.userId] || 0;
            pl.score = (pl.score || 0) + delta;
          }
        }

        const fantasylandData = boards.map(board => ({
          userId: board.userId,
          inFantasyland: board.inFantasyland,
          qualified: checkFantasylandEligibility(board.board, true)
        }));
        
        console.log('Fantasyland data being sent:', fantasylandData);
        
        io.to(room.id).emit(Events.REVEAL, {
          boards,
          results: totals,
          pairwise,
          round: room.round,
          fantasyland: fantasylandData
        });
        
        return;
      }
    }
  }

  // reset ready flags for next step (only if not mixed mode final sync)
  for (const pl of room.players.values()) pl.ready = false;

  const playersArr = [...room.players.values()];
  
  // Check if this is the initial set phase (round 1)
  if (room.phase === "initial-set") {

    room.phase = "round";
    room.currentRound = 2; // Move to round 2 after initial set

    
    // After moving to round phase, deal the next round of cards

    let needToDeal = false;
    
    for (const player of playersArr) {

      
      if (player.inFantasyland) {
        // Fantasyland player: needs 14 cards if they haven't played their hand yet
        if (!player.hasPlayedFantasylandHand) {

          needToDeal = true;
          
          // Deal 14 cards to fantasyland player
          const newly = dealNextRoundCards(room, player, room.currentRound);
          player.currentDeal = newly;

          io.to(player.socketId).emit(Events.DEAL_BATCH, { cards: newly, fantasyland: true, round: room.currentRound });
        }
      } else {
        // Normal player: follow the 5,3,3,3,3 pattern
        const cardsNeededForRound = room.currentRound === 1 ? 5 : 3;
        const totalCardsNeeded = room.currentRound === 1 ? 5 : 
          (room.currentRound === 2 ? 8 : 
           room.currentRound === 3 ? 11 : 
           room.currentRound === 4 ? 14 : 17);
        
        const hasEnoughCards = player.handCardIndex >= totalCardsNeeded;
        

        
        if (!hasEnoughCards && room.currentRound <= 5) {

          needToDeal = true;
          
          // Deal cards for current round
          const newly = dealNextRoundCards(room, player, room.currentRound);
          player.currentDeal = newly;

          io.to(player.socketId).emit(Events.DEAL_BATCH, { cards: newly, fantasyland: false, round: room.currentRound });
        }
      }
    }
    

    
    emitRoomState(io, room.id);
    return;
  }
  
  // Check if hand is complete
  if (checkHandComplete(room)) {

    room.phase = "reveal";
    room.handComplete = true;
    
    // Check for fantasyland eligibility and continuation
    for (const player of playersArr) {
      // Check if player should enter fantasyland (if not already in it)
      if (!player.inFantasyland && checkFantasylandEligibility(player.board, true)) {
        console.log(`Player ${player.userId} qualifies for fantasyland!`);
        player.inFantasyland = true;
        player.hasPlayedFantasylandHand = false; // Will be set to true when they play their first fantasyland hand
      }
      
      // Check for fantasyland continuation (only if player has played a fantasyland hand)
      if (player.inFantasyland && player.hasPlayedFantasylandHand && checkFantasylandContinuation(player.board)) {
        console.log(`Player ${player.userId} continues in fantasyland!`);
        // Player stays in fantasyland for next round
        player.hasPlayedFantasylandHand = false; // Reset for next fantasyland hand
      } else if (player.inFantasyland && player.hasPlayedFantasylandHand) {
        console.log(`Player ${player.userId} exits fantasyland`);
        player.inFantasyland = false;
        player.hasPlayedFantasylandHand = false;
      }
    }

    // Public boards summary (with foul reason if any)
    const boards = playersArr.map(pl => {
      const v = validateBoard(pl.board);
      return {
        userId: pl.userId,
        name: pl.name,
        board: pl.board,
        valid: !v.fouled,
        reason: v.fouled ? v.reason : null,
        inFantasyland: pl.inFantasyland
      };
    });

    // Pairwise detailed settle
    const totals = {};
    const pairwise = [];
    for (let i = 0; i < playersArr.length; i++) {
      for (let j = i + 1; j < playersArr.length; j++) {
        const A = playersArr[i], B = playersArr[j];
        const det = settlePairwiseDetailed(A.board, B.board);
        pairwise.push({
          aUserId: A.userId,
          bUserId: B.userId,
          a: det.a,
          b: det.b
        });

        if (playersArr.length === 2) {
          // Difference-based scoring: compute gross points for each, then use the difference
          const grossA = Math.max(det.a.lines.top, 0) + Math.max(det.a.lines.middle, 0) + Math.max(det.a.lines.bottom, 0)
            + (det.a.scoop > 0 ? det.a.scoop : 0) + det.a.royalties;
          const grossB = Math.max(det.b.lines.top, 0) + Math.max(det.b.lines.middle, 0) + Math.max(det.b.lines.bottom, 0)
            + (det.b.scoop > 0 ? det.b.scoop : 0) + det.b.royalties;
          const diff = grossA - grossB;
          totals[A.userId] = (totals[A.userId] || 0) + diff;
          totals[B.userId] = (totals[B.userId] || 0) - diff;
        } else {
          // Multi-player: sum zero-sum pairwise totals
          totals[A.userId] = (totals[A.userId] || 0) + det.a.total;
          totals[B.userId] = (totals[B.userId] || 0) + det.b.total;
        }
      }
    }

    // Update cumulative scores
    for (const pl of room.players.values()) {
      const delta = totals[pl.userId] || 0;
      pl.score = (pl.score || 0) + delta;
    }

    // Process chip updates for ranked matches
    if (room.isRanked) {
      console.log(`🔍 CHIP SYSTEM: Processing ranked match chip updates at reveal start`);
      
      // Update chip stacks
      for (const pl of room.players.values()) {
        const delta = totals[pl.userId] || 0;
        
        // Convert points to chips and update table chips
        const chipDelta = delta * 10;
        const oldTableChips = pl.tableChips || 500;
        pl.tableChips = oldTableChips + chipDelta;
        
        console.log(`🔍 CHIP SYSTEM: Player ${pl.name}: score delta ${delta}, chip delta ${chipDelta}, table chips ${oldTableChips} → ${pl.tableChips}`);
      }
      
      // Check if match is over
      const winner = playersArr.find(p => p.tableChips >= 1000);
      const loser = playersArr.find(p => p.tableChips <= 0);
      
      console.log(`🔍 CHIP SYSTEM: Checking match end - winner: ${winner?.name} (${winner?.tableChips} chips), loser: ${loser?.name} (${loser?.tableChips} chips)`);
      
      if (winner && loser) {
        console.log(`🔍 CHIP SYSTEM: Match ended! Winner: ${winner.name}, Loser: ${loser.name}`);
        // Match is over - update persistent chip balances
        const { updateUserChips } = await import("../store/database.js");
        await updateUserChips(winner.dbId, 500); // Winner gets +500 chips
        await updateUserChips(loser.dbId, -500);  // Loser loses -500 chips
        
        // Emit match end event
        io.to(room.id).emit(Events.MATCH_END, {
          winner: { userId: winner.userId, name: winner.name },
          loser: { userId: loser.userId, name: loser.name },
          finalChips: { winner: winner.tableChips, loser: loser.tableChips }
        });
        
        // Clean up room
        mem.rooms.delete(room.id);
        return;
      }
    }

    const fantasylandData = boards.map(board => ({
      userId: board.userId,
      inFantasyland: board.inFantasyland,
      qualified: board.inFantasyland || checkFantasylandEligibility(board.board, true)
    }));
    
    console.log('Fantasyland data being sent:', fantasylandData);
    
    io.to(room.id).emit(Events.REVEAL, {
      boards,
      results: totals,      // per-hand delta
      pairwise,             // detailed per-pair breakdown
      round: room.round,
      fantasyland: fantasylandData
    });
    
    return;
  }
  
  // Check if we're in mixed mode
  const hasFantasylandPlayers = [...room.players.values()].some(player => player.inFantasyland);
  const hasNormalPlayers = [...room.players.values()].some(player => !player.inFantasyland);
  const isMixedMode = hasFantasylandPlayers && hasNormalPlayers;
  
  console.log(`🔍 HANDLE ALL READY: Mode detection - hasFantasylandPlayers: ${hasFantasylandPlayers}, hasNormalPlayers: ${hasNormalPlayers}, isMixedMode: ${isMixedMode}`);
  
  if (isMixedMode) {
    console.log(`🔍 HANDLE ALL READY: Mixed mode detected`);
    
    // In mixed mode, handle normal player progression even if fantasyland player is done
    const normalPlayer = [...room.players.values()].find(p => !p.inFantasyland);
    const fantasylandPlayer = [...room.players.values()].find(p => p.inFantasyland);
    
    console.log(`🔍 HANDLE ALL READY: Normal player: ${normalPlayer?.name}, handCardIndex: ${normalPlayer?.handCardIndex}, ready: ${normalPlayer?.ready}`);
    console.log(`🔍 HANDLE ALL READY: Fantasyland player: ${fantasylandPlayer?.name}, handCardIndex: ${fantasylandPlayer?.handCardIndex}, ready: ${fantasylandPlayer?.ready}`);
    
    if (normalPlayer && fantasylandPlayer) {
      // Check if this is the final sync point (both players done)
      const normalPlayerRound = normalPlayer.handCardIndex === 17 ? 5 : 
        normalPlayer.handCardIndex === 14 ? 4 :
        normalPlayer.handCardIndex === 11 ? 3 :
        normalPlayer.handCardIndex === 8 ? 2 :
        normalPlayer.handCardIndex === 5 ? 1 : 0;
      
      console.log(`🔍 HANDLE ALL READY: Normal player round: ${normalPlayerRound}, fantasyland ready: ${fantasylandPlayer.ready}`);
      
      if (normalPlayerRound === 5 && fantasylandPlayer.ready) {
        console.log(`🔍 HANDLE ALL READY: Final sync point confirmed - proceeding to reveal`);
        // This is the final sync point - proceed to reveal
        room.phase = "reveal";
        room.handComplete = true;
        
        // Process chip updates for ranked matches immediately when reveal phase starts
        if (room.isRanked) {
          console.log(`🔍 CHIP SYSTEM: Processing ranked match chip updates at reveal start`);
          // Calculate scores first
          const boards = [];
          const totals = {};
          
          for (const pl of room.players.values()) {
            boards.push({
              userId: pl.userId,
              board: pl.board,
              inFantasyland: pl.inFantasyland
            });
          }
          
          // Calculate pairwise scores
          const pairwise = [];
          for (let i = 0; i < boards.length; i++) {
            for (let j = i + 1; j < boards.length; j++) {
              const A = boards[i];
              const B = boards[j];
              const det = settlePairwiseDetailed(A.board, B.board);
              pairwise.push({
                aUserId: A.userId,
                bUserId: B.userId,
                a: det.a,
                b: det.b
              });

              if (boards.length === 2) {
                const grossA = Math.max(det.a.lines.top, 0) + Math.max(det.a.lines.middle, 0) + Math.max(det.a.lines.bottom, 0)
                  + (det.a.scoop > 0 ? det.a.scoop : 0) + det.a.royalties;
                const grossB = Math.max(det.b.lines.top, 0) + Math.max(det.b.lines.middle, 0) + Math.max(det.b.lines.bottom, 0)
                  + (det.b.scoop > 0 ? det.b.scoop : 0) + det.b.royalties;
                const diff = grossA - grossB;
                totals[A.userId] = (totals[A.userId] || 0) + diff;
                totals[B.userId] = (totals[B.userId] || 0) - diff;
              }
            }
          }
          
          // Update chip stacks
          for (const pl of room.players.values()) {
            const delta = totals[pl.userId] || 0;
            pl.score = (pl.score || 0) + delta;
            
            // Convert points to chips and update table chips
            const chipDelta = delta * 10;
            const oldTableChips = pl.tableChips || 500;
            pl.tableChips = oldTableChips + chipDelta;
            
            console.log(`🔍 CHIP SYSTEM: Player ${pl.name}: score delta ${delta}, chip delta ${chipDelta}, table chips ${oldTableChips} → ${pl.tableChips}`);
          }
          
          // Check if match is over
          const playersArr = [...room.players.values()];
          const winner = playersArr.find(p => p.tableChips >= 1000);
          const loser = playersArr.find(p => p.tableChips <= 0);
          
          console.log(`🔍 CHIP SYSTEM: Checking match end - winner: ${winner?.name} (${winner?.tableChips} chips), loser: ${loser?.name} (${loser?.tableChips} chips)`);
          
          if (winner && loser) {
            console.log(`🔍 CHIP SYSTEM: Match ended! Winner: ${winner.name}, Loser: ${loser.name}`);
            // Match is over - update persistent chip balances
            const { updateUserChips } = await import("../store/database.js");
            await updateUserChips(winner.dbId, 500); // Winner gets +500 chips
            await updateUserChips(loser.dbId, -500);  // Loser loses -500 chips
            
            // Emit match end event
            io.to(room.id).emit(Events.MATCH_END, {
              winner: { userId: winner.userId, name: winner.name },
              loser: { userId: loser.userId, name: loser.name },
              finalChips: { winner: winner.tableChips, loser: loser.tableChips }
            });
            
            // Clean up room
            mem.rooms.delete(room.id);
            return;
          }
        }
        
        // Public boards summary (with foul reason if any)
        const boards = playersArr.map(pl => {
          const v = validateBoard(pl.board);
          return {
            userId: pl.userId,
            name: pl.name,
            board: pl.board,
            valid: !v.fouled,
            reason: v.fouled ? v.reason : null,
            inFantasyland: pl.inFantasyland
          };
        });

        // Pairwise detailed settle
        const totals = {};
        const pairwise = [];
        for (let i = 0; i < playersArr.length; i++) {
          for (let j = i + 1; j < playersArr.length; j++) {
            const A = playersArr[i], B = playersArr[j];
            const det = settlePairwiseDetailed(A.board, B.board);
            pairwise.push({
              aUserId: A.userId,
              bUserId: B.userId,
              a: det.a,
              b: det.b
            });

            if (playersArr.length === 2) {
              const grossA = Math.max(det.a.lines.top, 0) + Math.max(det.a.lines.middle, 0) + Math.max(det.a.lines.bottom, 0)
                + (det.a.scoop > 0 ? det.a.scoop : 0) + det.a.royalties;
              const grossB = Math.max(det.b.lines.top, 0) + Math.max(det.b.lines.middle, 0) + Math.max(det.b.lines.bottom, 0)
                + (det.b.scoop > 0 ? det.b.scoop : 0) + det.b.royalties;
              const diff = grossA - grossB;
              totals[A.userId] = (totals[A.userId] || 0) + diff;
              totals[B.userId] = (totals[B.userId] || 0) - diff;
            } else {
              totals[A.userId] = (totals[A.userId] || 0) + det.a.total;
              totals[B.userId] = (totals[B.userId] || 0) + det.b.total;
            }
          }
        }

        // For non-ranked matches, just update scores normally
        if (!room.isRanked) {
          for (const pl of room.players.values()) {
            const delta = totals[pl.userId] || 0;
            pl.score = (pl.score || 0) + delta;
          }
        }

        const fantasylandData = boards.map(board => ({
          userId: board.userId,
          inFantasyland: board.inFantasyland,
          qualified: checkFantasylandEligibility(board.board, true)
        }));
        
        console.log('Fantasyland data being sent:', fantasylandData);
        
        io.to(room.id).emit(Events.REVEAL, {
          boards,
          results: totals,
          pairwise,
          round: room.round,
          fantasyland: fantasylandData
        });
        
        return;
      } else {
        console.log(`🔍 HANDLE ALL READY: Not final sync point - normal round ${normalPlayerRound}, fantasyland ready: ${fantasylandPlayer.ready}`);
        
        // Not final sync point - check if normal player needs more cards
        let anyPlayerAdvanced = false;
        
        // Check if normal player needs more cards
        let currentPlayerRound;
        if (normalPlayer.handCardIndex === 5) currentPlayerRound = 1;      // Just completed round 1
        else if (normalPlayer.handCardIndex === 8) currentPlayerRound = 2; // Just completed round 2
        else if (normalPlayer.handCardIndex === 11) currentPlayerRound = 3; // Just completed round 3
        else if (normalPlayer.handCardIndex === 14) currentPlayerRound = 4; // Just completed round 4
        else if (normalPlayer.handCardIndex === 17) currentPlayerRound = 5; // Just completed round 5
        else currentPlayerRound = 0; // Still in progress
        
        console.log(`🔍 HANDLE ALL READY: Current player round: ${currentPlayerRound}, handCardIndex: ${normalPlayer.handCardIndex}`);
        
        if (currentPlayerRound >= 1 && currentPlayerRound < 5) {
          // Normal player just completed a round and needs the next batch
          const nextRound = currentPlayerRound + 1;
          
          console.log(`🔍 HANDLE ALL READY: Normal player needs next round ${nextRound}`);
          anyPlayerAdvanced = true;
          
          // Deal cards for next round
          const newly = dealNextRoundCards(room, normalPlayer, nextRound);
          normalPlayer.currentDeal = newly;

          console.log(`🔍 HANDLE ALL READY: Dealt ${newly.length} cards to normal player: ${newly.join(', ')}`);
          io.to(normalPlayer.socketId).emit(Events.DEAL_BATCH, { cards: newly, fantasyland: false, round: nextRound });
        } else {
          console.log(`🔍 HANDLE ALL READY: Normal player doesn't need more cards - currentPlayerRound: ${currentPlayerRound}`);
        }
        
        if (anyPlayerAdvanced) {
          // Normal player got new cards, continue the round
          console.log(`🔍 HANDLE ALL READY: Normal player advanced, continuing round`);
          emitRoomState(io, room.id);
          return;
        } else {
          // No one advanced, but not final sync point - this shouldn't happen
          console.log(`🔍 HANDLE ALL READY: Mixed mode - no advancement but not final sync point`);
          emitRoomState(io, room.id);
          return;
        }
      }
    }
  }
  
  // In mixed mode, handleAllPlayersReady should only be called at the final sync point
  // In normal mode, handleAllPlayersReady handles progression
  if (!isMixedMode) {
    // NORMAL MODE: Handle per-player round progression
    let anyPlayerAdvanced = false;
    
    for (const player of playersArr) {
      // Normal player: check if they need more cards for their next round
      // Calculate which round they just completed based on cards dealt
      let currentPlayerRound;
      if (player.handCardIndex === 5) currentPlayerRound = 1;      // Just completed round 1
      else if (player.handCardIndex === 8) currentPlayerRound = 2; // Just completed round 2
      else if (player.handCardIndex === 11) currentPlayerRound = 3; // Just completed round 3
      else if (player.handCardIndex === 14) currentPlayerRound = 4; // Just completed round 4
      else if (player.handCardIndex === 17) currentPlayerRound = 5; // Just completed round 5
      else currentPlayerRound = 0; // Still in progress
      
      if (currentPlayerRound >= 1 && currentPlayerRound < 5) {
        // Player just completed a round and needs the next batch
        const nextRound = currentPlayerRound + 1;
        
        anyPlayerAdvanced = true;
        
        // Deal cards for next round
        const newly = dealNextRoundCards(room, player, nextRound);
        player.currentDeal = newly;

        io.to(player.socketId).emit(Events.DEAL_BATCH, { cards: newly, fantasyland: false, round: nextRound });
      }
    }
    
    if (anyPlayerAdvanced) {
      // Some players got new cards, continue the round
      console.log(`🔍 HANDLE ALL READY: Normal mode - players advanced, continuing round`);
      emitRoomState(io, room.id);
      return;
    } else {
      // No one advanced - check if hand is complete
      console.log(`🔍 HANDLE ALL READY: Normal mode - no advancement, checking if hand complete`);
      
      // Debug logging for hand completion check
      const normalPlayers = [...room.players.values()].filter(p => !p.inFantasyland);
      const fantasylandPlayers = [...room.players.values()].filter(p => p.inFantasyland);
      
      console.log(`🔍 HANDLE ALL READY: Debug - Normal players: ${normalPlayers.length}, Fantasyland players: ${fantasylandPlayers.length}`);
      
      for (const player of normalPlayers) {
        console.log(`🔍 HANDLE ALL READY: Debug - Player ${player.name}: handCardIndex=${player.handCardIndex}, ready=${player.ready}, hand.length=${player.hand.length}`);
      }
      
      for (const player of fantasylandPlayers) {
        console.log(`🔍 HANDLE ALL READY: Debug - Fantasyland player ${player.name}: hasPlayedFantasylandHand=${player.hasPlayedFantasylandHand}, ready=${player.ready}`);
      }
      
      const handComplete = checkHandComplete(room);
      console.log(`🔍 HANDLE ALL READY: Debug - checkHandComplete returned: ${handComplete}`);
      
      if (handComplete) {
        console.log(`🔍 HANDLE ALL READY: Normal mode hand complete - proceeding to reveal`);
        room.phase = "reveal";
        room.handComplete = true;
        
        // Process chip updates for ranked matches immediately when reveal phase starts
        if (room.isRanked) {
          console.log(`🔍 CHIP SYSTEM: Processing ranked match chip updates at reveal start`);
          // Calculate scores first
          const boards = [];
          const totals = {};
          
          for (const pl of room.players.values()) {
            boards.push({
              userId: pl.userId,
              board: pl.board,
              inFantasyland: pl.inFantasyland
            });
          }
          
          // Calculate pairwise scores
          const pairwise = [];
          for (let i = 0; i < boards.length; i++) {
            for (let j = i + 1; j < boards.length; j++) {
              const A = boards[i];
              const B = boards[j];
              const det = settlePairwiseDetailed(A.board, B.board);
              pairwise.push({
                aUserId: A.userId,
                bUserId: B.userId,
                a: det.a,
                b: det.b
              });

              if (boards.length === 2) {
                const grossA = Math.max(det.a.lines.top, 0) + Math.max(det.a.lines.middle, 0) + Math.max(det.a.lines.bottom, 0)
                  + (det.a.scoop > 0 ? det.a.scoop : 0) + det.a.royalties;
                const grossB = Math.max(det.b.lines.top, 0) + Math.max(det.b.lines.middle, 0) + Math.max(det.b.lines.bottom, 0)
                  + (det.b.scoop > 0 ? det.b.scoop : 0) + det.b.royalties;
                const diff = grossA - grossB;
                totals[A.userId] = (totals[A.userId] || 0) + diff;
                totals[B.userId] = (totals[B.userId] || 0) - diff;
              }
            }
          }
          
          // Update chip stacks
          for (const pl of room.players.values()) {
            const delta = totals[pl.userId] || 0;
            pl.score = (pl.score || 0) + delta;
            
            // Convert points to chips and update table chips
            const chipDelta = delta * 10;
            const oldTableChips = pl.tableChips || 500;
            pl.tableChips = oldTableChips + chipDelta;
            
            console.log(`🔍 CHIP SYSTEM: Player ${pl.name}: score delta ${delta}, chip delta ${chipDelta}, table chips ${oldTableChips} → ${pl.tableChips}`);
          }
          
          // Check if match is over
          const playersArr = [...room.players.values()];
          const winner = playersArr.find(p => p.tableChips >= 1000);
          const loser = playersArr.find(p => p.tableChips <= 0);
          
          console.log(`🔍 CHIP SYSTEM: Checking match end - winner: ${winner?.name} (${winner?.tableChips} chips), loser: ${loser?.name} (${loser?.tableChips} chips)`);
          
          if (winner && loser) {
            console.log(`🔍 CHIP SYSTEM: Match ended! Winner: ${winner.name}, Loser: ${loser.name}`);
            // Match is over - update persistent chip balances
            const { updateUserChips } = await import("../store/database.js");
            await updateUserChips(winner.dbId, 500); // Winner gets +500 chips
            await updateUserChips(loser.dbId, -500);  // Loser loses -500 chips
            
            // Emit match end event
            io.to(room.id).emit(Events.MATCH_END, {
              winner: { userId: winner.userId, name: winner.name },
              loser: { userId: loser.userId, name: loser.name },
              finalChips: { winner: winner.tableChips, loser: loser.tableChips }
            });
            
            // Clean up room
            mem.rooms.delete(room.id);
            return;
          }
        }
        
        // Public boards summary (with foul reason if any)
        const boards = playersArr.map(pl => {
          const v = validateBoard(pl.board);
          return {
            userId: pl.userId,
            name: pl.name,
            board: pl.board,
            valid: !v.fouled,
            reason: v.fouled ? v.reason : null,
            inFantasyland: pl.inFantasyland
          };
        });

        // Pairwise detailed settle
        const totals = {};
        const pairwise = [];
        for (let i = 0; i < playersArr.length; i++) {
          for (let j = i + 1; j < playersArr.length; j++) {
            const A = playersArr[i], B = playersArr[j];
            const det = settlePairwiseDetailed(A.board, B.board);
            pairwise.push({
              aUserId: A.userId,
              bUserId: B.userId,
              a: det.a,
              b: det.b
            });

            if (playersArr.length === 2) {
              const grossA = Math.max(det.a.lines.top, 0) + Math.max(det.a.lines.middle, 0) + Math.max(det.a.lines.bottom, 0)
                + (det.a.scoop > 0 ? det.a.scoop : 0) + det.a.royalties;
              const grossB = Math.max(det.b.lines.top, 0) + Math.max(det.b.lines.middle, 0) + Math.max(det.b.lines.bottom, 0)
                + (det.b.scoop > 0 ? det.b.scoop : 0) + det.b.royalties;
              const diff = grossA - grossB;
              totals[A.userId] = (totals[A.userId] || 0) + diff;
              totals[B.userId] = (totals[B.userId] || 0) - diff;
            } else {
              totals[A.userId] = (totals[A.userId] || 0) + det.a.total;
              totals[B.userId] = (totals[B.userId] || 0) + det.b.total;
            }
          }
        }

        // For non-ranked matches, just update scores normally
        if (!room.isRanked) {
          for (const pl of room.players.values()) {
            const delta = totals[pl.userId] || 0;
            pl.score = (pl.score || 0) + delta;
          }
        }

        // Check for fantasyland eligibility and continuation
        for (const player of playersArr) {
          // Check if player should enter fantasyland (if not already in it)
          if (!player.inFantasyland && checkFantasylandEligibility(player.board, true)) {
            console.log(`Player ${player.userId} qualifies for fantasyland!`);
            player.inFantasyland = true;
            player.hasPlayedFantasylandHand = false; // Will be set to true when they play their first fantasyland hand
          }
          
          // Check for fantasyland continuation (only if player has played a fantasyland hand)
          if (player.inFantasyland && player.hasPlayedFantasylandHand && checkFantasylandContinuation(player.board)) {
            console.log(`Player ${player.userId} continues in fantasyland!`);
            // Player stays in fantasyland for next round
            player.hasPlayedFantasylandHand = false; // Reset for next fantasyland hand
          } else if (player.inFantasyland && player.hasPlayedFantasylandHand) {
            console.log(`Player ${player.userId} exits fantasyland`);
            player.inFantasyland = false;
            player.hasPlayedFantasylandHand = false;
          }
        }

        const fantasylandData = boards.map(board => ({
          userId: board.userId,
          inFantasyland: board.inFantasyland,
          qualified: checkFantasylandEligibility(board.board, true)
        }));
        
        console.log('Fantasyland data being sent:', fantasylandData);
        
        io.to(room.id).emit(Events.REVEAL, {
          boards,
          results: totals,
          pairwise,
          round: room.round,
          fantasyland: fantasylandData
        });
        
        return;
      } else {
        console.log(`🔍 HANDLE ALL READY: Normal mode - hand not complete, continuing`);
        emitRoomState(io, room.id);
        return;
      }
    }
  }
}

/** Start a new hand/round: deal initial 5 to each player (same cards to everyone) */
export function startRoundHandler(io, socket, { roomId }) {
  console.log(`🔍 START ROUND HANDLER: Called for room ${roomId}`);
  
  const room = mem.rooms.get(roomId);
  if (!room) {
    console.log(`🔍 START ROUND HANDLER: Room not found`);
    return socket.emit(Events.ERROR, { message: "Room not found" });
  }

  console.log(`🔍 START ROUND HANDLER: Room phase: ${room.phase}, players: ${room.players.size}`);
  console.log(`🔍 START ROUND HANDLER: Players:`, [...room.players.keys()]);
  console.log(`🔍 START ROUND HANDLER: nextRoundReady:`, [...room.nextRoundReady]);

  if (room.players.size < rules.players.min) {
    console.log(`🔍 START ROUND HANDLER: Not enough players`);
    return socket.emit(Events.ERROR, { message: "Need more players" });
  }

  const playerId = socket.user.sub;
  
  // Handle initial round start from lobby
  if (room.phase === "lobby") {
    // Add this player to the ready set for initial round
    room.nextRoundReady.add(playerId);
    
    // Check if all players are ready
    if (allReadyForNextRound(room)) {
      // All players ready, start the first round
      startRound(room);
      io.to(roomId).emit(Events.START_ROUND, { round: room.round, roomId: roomId });

      // Send initial cards privately to each player based on their fantasyland status
      for (const p of room.players.values()) {
        const cardCount = p.inFantasyland ? 14 : 5;
        const slice = p.hand.slice(-cardCount);
        p.currentDeal = slice;
        io.to(p.socketId).emit(Events.DEAL_BATCH, { 
          cards: slice, 
          fantasyland: p.inFantasyland,
          round: room.currentRound
        });
      }
    } else {
      // Not all players ready yet, just emit the ready state
      io.to(roomId).emit(Events.NEXT_ROUND_READY_UPDATE, { 
        readyPlayers: [...room.nextRoundReady],
        allReady: false
      });
    }
    
    emitRoomState(io, roomId);
    return;
  }
  
  // Handle next round start from reveal phase
  if (room.phase === "reveal") {
    // Add this player to the ready set
    room.nextRoundReady.add(playerId);
    
    // Check if all players are ready
    if (allReadyForNextRound(room)) {
      // All players ready, start the round
      startRound(room);
      io.to(roomId).emit(Events.START_ROUND, { round: room.round, roomId: roomId });

      // Send initial cards privately to each player based on their fantasyland status
      for (const p of room.players.values()) {
        const cardCount = p.inFantasyland ? 14 : 5;
        const slice = p.hand.slice(-cardCount);
        p.currentDeal = slice;
        io.to(p.socketId).emit(Events.DEAL_BATCH, { 
          cards: slice, 
          fantasyland: p.inFantasyland,
          round: room.currentRound
        });
      }
    } else {
      // Not all players ready yet, just emit the ready state
      io.to(roomId).emit(Events.NEXT_ROUND_READY_UPDATE, { 
        readyPlayers: [...room.nextRoundReady],
        allReady: false
      });
    }

    emitRoomState(io, roomId);
    return;
  }

  // If we're in any other phase, don't allow starting
  return socket.emit(Events.ERROR, { message: "Can only start round from lobby or after reveal" });
}

/* ---------------- Legacy single-action handlers (kept for manual testing) ---------------- */

export function placeHandler(io, socket, { roomId, placements }) {
  const room = mem.rooms.get(roomId);
  if (!room) return;
  const p = room.players.get(socket.user.sub);
  if (!p) return;

  for (const { row, card } of placements || []) {
    const idx = p.hand.indexOf(card);
    if (idx === -1) return socket.emit(Events.ERROR, { message: "Card not in your hand" });
    if (!p.board[row]) return socket.emit(Events.ERROR, { message: "Invalid row" });

    const limit =
      row === "top" ? rules.layout.top :
      row === "middle" ? rules.layout.middle : rules.layout.bottom;

    if (p.board[row].length >= limit) {
      return socket.emit(Events.ERROR, { message: `${row} full` });
    }

    p.hand.splice(idx, 1);
    p.board[row].push(card);
  }
  emitRoomState(io, roomId);
}

export function discardHandler(io, socket, { roomId, card }) {
  const room = mem.rooms.get(roomId);
  if (!room) return;
  const p = room.players.get(socket.user.sub);
  if (!p) return;

  const idx = p.hand.indexOf(card);
  if (idx === -1) return socket.emit(Events.ERROR, { message: "Card not in your hand" });
  p.hand.splice(idx, 1);
  p.discards.push(card);
  emitRoomState(io, roomId);
}

/* ---------------- Batched READY handler (apply placements+discard atomically) ---------------- */

export function readyHandler(io, socket, { roomId, placements = [], discard = null }) {
  console.log(`🔍 READY HANDLER: ===== READY HANDLER CALLED =====`);
  console.log(`🔍 READY HANDLER: roomId: ${roomId}`);
  console.log(`🔍 READY HANDLER: placements.length: ${placements?.length || 0}`);
  console.log(`🔍 READY HANDLER: discard: ${discard}`);
  if (placements && placements.length > 0) {
    console.log(`🔍 READY HANDLER: placements: ${JSON.stringify(placements)}`);
  }
  
  const room = mem.rooms.get(roomId);
  if (!room) {
    console.log(`🔍 READY HANDLER: Room not found`);
    return;
  }

  const p = room.players.get(socket.user.sub);
  if (!p) {
    console.log(`🔍 READY HANDLER: Player not found`);
    return;
  }

  console.log(`🔍 READY HANDLER: Player: ${p.name}`);
  console.log(`🔍 READY HANDLER: inFantasyland: ${p.inFantasyland}`);
  console.log(`🔍 READY HANDLER: handCardIndex: ${p.handCardIndex}`);
  console.log(`🔍 READY HANDLER: hand.length: ${p.hand.length}`);
  console.log(`🔍 READY HANDLER: hand: ${JSON.stringify(p.hand)}`);
  console.log(`🔍 READY HANDLER: board: ${JSON.stringify(p.board)}`);
  console.log(`🔍 READY HANDLER: currentDeal: ${JSON.stringify(p.currentDeal)}`);

  // Apply this player's batch before marking ready
  console.log(`🔍 READY HANDLER: ===== CALLING APPLY BATCH =====`);
  const ok = applyBatch(room, p, { placements, discard });
  console.log(`🔍 READY HANDLER: applyBatch success: ${ok.success}`);
  console.log(`🔍 READY HANDLER: applyBatch message: ${ok.message}`);
  console.log(`🔍 READY HANDLER: After applyBatch - hand.length: ${p.hand.length}`);
  console.log(`🔍 READY HANDLER: After applyBatch - hand: ${JSON.stringify(p.hand)}`);
  console.log(`🔍 READY HANDLER: After applyBatch - board: ${JSON.stringify(p.board)}`);
  console.log(`🔍 READY HANDLER: After applyBatch - discards: ${JSON.stringify(p.discards)}`);
  
  if (!ok.success) {
    return socket.emit(Events.ERROR, { message: ok.message });
  }

  // Acknowledge to the acting player with the exact applied payload
  socket.emit(Events.ACTION_APPLIED, {
    placements,
    discard: ok.discard || null,
    board: p.board,
    hand: p.hand,
    discards: p.discards,
  });

  p.ready = true;
  p.roundComplete = true; // Mark that this player has completed the current round
  console.log(`🔍 READY HANDLER: ===== PLAYER MARKED READY =====`);
  console.log(`🔍 READY HANDLER: ${p.name} ready: ${p.ready}`);
  console.log(`🔍 READY HANDLER: ${p.name} roundComplete: ${p.roundComplete}`);
  console.log(`🔍 READY HANDLER: ${p.name} hasPlayedFantasylandHand: ${p.hasPlayedFantasylandHand}`);

  // Check if we're in mixed mode (one fantasyland, one normal) vs normal mode (both normal)
  const hasFantasylandPlayers = [...room.players.values()].some(player => player.inFantasyland);
  const hasNormalPlayers = [...room.players.values()].some(player => !player.inFantasyland);
  const isMixedMode = hasFantasylandPlayers && hasNormalPlayers;
  
  console.log(`🔍 READY HANDLER: ===== MODE DETECTION =====`);
  console.log(`🔍 READY HANDLER: hasFantasylandPlayers: ${hasFantasylandPlayers}`);
  console.log(`🔍 READY HANDLER: hasNormalPlayers: ${hasNormalPlayers}`);
  console.log(`🔍 READY HANDLER: isMixedMode: ${isMixedMode}`);
  
  // MIXED MODE: Simple independent progression
  console.log(`🔍 READY HANDLER: ===== MIXED MODE CHECK =====`);
  console.log(`🔍 READY HANDLER: isMixedMode: ${isMixedMode}`);
  console.log(`🔍 READY HANDLER: room.phase: ${room.phase}`);
  
  // Handle phase transition for mixed mode
  if (isMixedMode && room.phase === "initial-set") {
    console.log(`🔍 READY HANDLER: Mixed mode initial-set - transitioning to round phase`);
    room.phase = "round";
    room.currentRound = 2; // Move to round 2 after initial set
  }
  
  if (isMixedMode && room.phase === "round") {
    console.log(`🔍 READY HANDLER: Mixed mode detected - processing player`);
    
          if (p.inFantasyland) {
        // Fantasy Land player: Done, locked for reveal
        console.log(`🔍 READY HANDLER: ===== FANTASY LAND PLAYER =====`);
        console.log(`🔍 READY HANDLER: Fantasy Land player ${p.name} ready - locked for reveal`);
        // Ensure Fantasy Land player stays ready
        p.ready = true;
        p.roundComplete = true;
      } else {
        // Normal player: Check if they need more cards
        console.log(`🔍 READY HANDLER: ===== NORMAL PLAYER =====`);
        let currentRound;
        if (p.handCardIndex === 5) currentRound = 1;      // Just completed round 1
        else if (p.handCardIndex === 8) currentRound = 2; // Just completed round 2
        else if (p.handCardIndex === 11) currentRound = 3; // Just completed round 3
        else if (p.handCardIndex === 14) currentRound = 4; // Just completed round 4
        else if (p.handCardIndex === 17) currentRound = 5; // Just completed round 5
        else currentRound = 0;
        
        console.log(`🔍 READY HANDLER: Normal player ${p.name} completed round ${currentRound}, handCardIndex: ${p.handCardIndex}`);
        
        if (currentRound >= 1 && currentRound < 5) {
          // Give next batch immediately
          console.log(`🔍 READY HANDLER: Normal player needs next batch - currentRound: ${currentRound}`);
          const nextRound = currentRound + 1;
          console.log(`🔍 READY HANDLER: Next round will be: ${nextRound}`);
          
          const newly = dealNextRoundCards(room, p, nextRound);
          console.log(`🔍 READY HANDLER: dealNextRoundCards returned: [${newly.join(', ')}]`);
          
          p.currentDeal = newly;
          p.ready = false; // Reset ready since they have new cards
          p.roundComplete = false;
          
          console.log(`🔍 READY HANDLER: Normal player ${p.name} gets round ${nextRound}: [${newly.join(', ')}]`);
          console.log(`🔍 READY HANDLER: Sending DEAL_BATCH to player`);
          io.to(p.socketId).emit(Events.DEAL_BATCH, { cards: newly, fantasyland: false, round: nextRound });
          emitRoomState(io, roomId);
          console.log(`🔍 READY HANDLER: Returning early - don't check final sync`);
          return; // Don't check for final sync yet
        } else if (currentRound === 5) {
          // Normal player done - check for final sync
          console.log(`🔍 READY HANDLER: Normal player ${p.name} completed all rounds`);
        } else {
          console.log(`🔍 READY HANDLER: Normal player currentRound: ${currentRound} - not in valid range`);
        }
      }
  }

  // FINAL SYNC CHECK: Only for mixed mode when both players are done
  if (isMixedMode) {
    const normalPlayer = [...room.players.values()].find(p => !p.inFantasyland);
    const fantasylandPlayer = [...room.players.values()].find(p => p.inFantasyland);
    
    if (normalPlayer && fantasylandPlayer) {
      const normalDone = normalPlayer.handCardIndex === 17 && normalPlayer.ready;
      const fantasylandDone = fantasylandPlayer.ready;
      
      console.log(`🔍 READY HANDLER: ===== FINAL SYNC CHECK =====`);
      console.log(`🔍 READY HANDLER: Normal player done: ${normalDone} (handCardIndex: ${normalPlayer.handCardIndex}, ready: ${normalPlayer.ready})`);
      console.log(`🔍 READY HANDLER: Fantasy Land player done: ${fantasylandDone} (ready: ${fantasylandPlayer.ready})`);
      
      if (normalDone && fantasylandDone) {
        console.log(`🔍 READY HANDLER: Both players done - proceeding to reveal`);
        handleAllPlayersReady(room, io);
        return;
      } else {
        console.log(`🔍 READY HANDLER: Not both done yet - waiting`);
      }
    }
  }
  
  // NORMAL MODE: Use allReady check
  if (!isMixedMode) {
    // NORMAL MODE: Synchronous progression - use allReady check
    console.log(`🔍 READY HANDLER: Normal mode check - allReady: ${allReady(room)}`);
    console.log(`🔍 READY HANDLER: Players ready status:`, [...room.players.values()].map(p => `${p.name}: ${p.ready}`));
    
    if (allReady(room)) {
      console.log(`🔍 READY HANDLER: Normal mode - all players ready, calling handleAllPlayersReady`);
      handleAllPlayersReady(room, io);
    } else {
      console.log(`🔍 READY HANDLER: Normal mode - not all players ready yet`);
      emitRoomState(io, roomId);
    }
  }
}

/* ---------------- Public state emitter (redacted) ---------------- */

export function emitRoomState(io, roomId) {
  const room = mem.rooms.get(roomId);
  if (!room) return;

  const publicPlayers = [...room.players.values()].map(p => ({
    userId: p.userId,
    name: p.name,
    placed: {
      top: p.board.top.length,
      middle: p.board.middle.length,
      bottom: p.board.bottom.length
    },
    score: p.score || 0,
    ready: p.ready,
    inFantasyland: p.inFantasyland,
    roundComplete: p.roundComplete,
    tableChips: p.tableChips || 0 // Add table chips for ranked matches
  }));

  io.to(roomId).emit(Events.ROOM_STATE, {
    roomId: room.id,
    phase: room.phase,
    round: room.round,
    currentRound: room.currentRound,
    isRanked: room.isRanked || false, // Add ranked flag
    players: publicPlayers
  });
}

/* ---------------- Internal helpers ---------------- */

/**
 * Apply a player's batch (placements + optional discard) with per-phase validation.
 * Does not broadcast; just mutates the player's state inside the room.
 */
function applyBatch(room, player, { placements, discard }) {
  // Work on clones to validate first
  const hand = [...player.hand];
  const board = {
    top: [...player.board.top],
    middle: [...player.board.middle],
    bottom: [...player.board.bottom]
  };

  const isInitial = room.phase === "initial-set";
  const isFantasyland = player.inFantasyland && !player.hasPlayedFantasylandHand && room.phase === "round";
  const isNormalRound = !player.inFantasyland && room.phase === "round";

  if (isInitial) {
    if (discard) {
      return { success: false, message: "No discard allowed during initial set." };
    }
    const required = player.inFantasyland ? 13 : 5; // Fantasyland players place 13, normal players place 5
    if ((placements?.length || 0) !== required) {
      return { success: false, message: `You must place exactly ${required} cards to start.` };
    }
    // Ensure all placements are from currentDeal
    const cd = new Set(player.currentDeal || []);
    for (const { card } of placements || []) {
      if (!cd.has(card)) {
        return { success: false, message: "Placements must come from the dealt cards." };
      }
    }
  } else if (isFantasyland) {
    // Fantasyland round: must place exactly 13 cards, remaining card is auto-discarded
    const needPlace = 13; // Fantasyland players place 13 cards, 1 is auto-discarded
    console.log(`🔍 APPLY BATCH: Fantasy Land validation - needPlace: ${needPlace}, placements: ${placements?.length || 0}`);
    
    if ((placements?.length || 0) !== needPlace) {
      return { success: false, message: `You must place exactly ${needPlace} cards in fantasyland.` };
    }

    // Enforce placements must come from currentDeal
    const cd = player.currentDeal || [];
    for (const { card } of placements || []) {
      if (!cd.includes(card)) {
        return { success: false, message: "Placements must come from the 14 dealt cards." };
      }
    }

    // Fantasyland: remaining card is auto-discarded
    if (discard) {
      return { success: false, message: "No manual discard allowed in fantasyland - remaining card is auto-discarded." };
    }
    
    // Auto-discard the remaining card from currentDeal
    const placedSet = new Set((placements || []).map(p => p.card));
    const remainingCard = cd.find(c => !placedSet.has(c));
    if (remainingCard) {
      discard = remainingCard;
      console.log(`🔍 APPLY BATCH: Fantasy Land auto-discarding ${remainingCard}`);
    }
    
    // Mark that fantasyland hand has been played
    player.hasPlayedFantasylandHand = true;
  } else if (isNormalRound) {
    // Normal pineapple round: check if this is round 1 (5 cards) or other rounds (3 cards)
    const cd = player.currentDeal || [];
    const isRound1 = cd.length === 5;
    
    if (isRound1) {
      // Round 1: must place exactly 5 cards, no discard
      const needPlace = 5;
      if ((placements?.length || 0) !== needPlace) {
        return { success: false, message: `You must place exactly ${needPlace} cards in round 1.` };
      }
      
      if (discard) {
        return { success: false, message: "No discard allowed in round 1." };
      }
      
      // Enforce placements must come from currentDeal
      for (const { card } of placements || []) {
        if (!cd.includes(card)) {
          return { success: false, message: "Placements must come from the 5 dealt cards." };
        }
      }
    } else {
      // Rounds 2-5: must place exactly 2 and discard exactly 1
      const needPlace = 2;
      if ((placements?.length || 0) !== needPlace) {
        return { success: false, message: `You must place exactly ${needPlace} cards this round.` };
      }

      // Derive discard automatically if not provided, from currentDeal minus placements
      const placedSet = new Set((placements || []).map(p => p.card));

      // Enforce placements must come from currentDeal
      for (const { card } of placements || []) {
        if (!cd.includes(card)) {
          return { success: false, message: "Placements must come from the 3 dealt cards." };
        }
      }

      let computedDiscard = discard;
      if (!computedDiscard) {
        const leftover = cd.filter(c => !placedSet.has(c));
        if (leftover.length !== 1) {
          return { success: false, message: "Could not infer discard; please try again." };
        }
        computedDiscard = leftover[0];
      }

      // Validate discard also comes from currentDeal and not among placements
      if (!cd.includes(computedDiscard) || placedSet.has(computedDiscard)) {
        return { success: false, message: "Invalid discard selection." };
      }
      discard = computedDiscard;
    }
  }

  // Validate placements
  if (placements) {
    console.log(`🔍 APPLY BATCH: Processing ${placements.length} placements`);
    for (const { row, card } of placements) {
      const idx = hand.indexOf(card);
      if (idx === -1) return { success: false, message: `Card ${card} is not in your hand.` };
      if (!board[row]) return { success: false, message: `Invalid row ${row}.` };

      const limit =
        row === "top" ? rules.layout.top :
        row === "middle" ? rules.layout.middle : rules.layout.bottom;

      if (board[row].length >= limit) {
        return { success: false, message: `${row} is full.` };
      }

      hand.splice(idx, 1);
      board[row].push(card);
      console.log(`🔍 APPLY BATCH: Moved ${card} to ${row}, hand.length now: ${hand.length}`);
    }
  }

  // Validate & apply discard
  if (discard) {
    const di = hand.indexOf(discard);
    if (di === -1) return { success: false, message: `Discard ${discard} is not in your hand.` };
    hand.splice(di, 1);
    console.log(`🔍 APPLY BATCH: Discarded ${discard}, hand.length now: ${hand.length}`);
  }

  // Commit
  player.hand = hand;
  player.board.top = board.top;
  player.board.middle = board.middle;
  player.board.bottom = board.bottom;
  if (discard) player.discards.push(discard);
  // Clear currentDeal once resolved
  player.currentDeal = [];

  return { success: true, discard };
}
