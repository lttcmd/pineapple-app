import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated } from "react-native";

// Helper function to compute total committed cards
const committedTotal = (b) => b.top.length + b.middle.length + b.bottom.length;
import { View, Text, Button, FlatList, findNodeHandle, UIManager, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { onSocketEvent, emit } from "../net/socket";
import { useGame } from "../state/useGame";
import { colors } from "../theme/colors";
import Card from "../components/Card";
import DraggableCard from "../components/DraggableCard";
import BackButton from "../components/BackButton";
import { useDrag } from "../drag/DragContext";
import { play as playSfx } from "../sound/sfx";

  // constants
  const SLOT_W = 59;   // 4% smaller (62 * 0.96)
  const SLOT_H = 88;   // 4% smaller (92 * 0.96)
  const SLOT_GAP = 3;  // tighter
  const ROW_GAP = 6;   // vertical gap between rows
const BOARD_HEIGHT = SLOT_H * 3 + ROW_GAP * 2; // fixed board area height (3 rows)
const CONTROLS_HEIGHT = 80; // pinned bottom bar height incl. padding
const HAND_HEIGHT = SLOT_H + 24; // fixed hand area height to prevent layout jump


// Foul effect - generate random transformations for "broken" cards
function getFoulTransform(index) {
  const seed = index * 7 + 13; // Simple deterministic randomness
  const rotation = (seed % 21 - 10) * 2; // -20 to +20 degrees
  const offsetX = (seed % 7 - 3) * 2; // -6 to +6 pixels
  const offsetY = (seed % 5 - 2) * 2; // -4 to +4 pixels
  return {
    transform: [
      { rotate: `${rotation}deg` },
      { translateX: offsetX },
      { translateY: offsetY }
    ]
  };
}

// Rainbow glow effect for Fantasy Land
function useRainbowGlow() {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    );
    animation.start();
    
    return () => animation.stop();
  }, [animatedValue]);
  
  const rainbowColor = animatedValue.interpolate({
    inputRange: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1],
    outputRange: ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0080ff', '#8000ff', '#ff0000'],
  });
  
  return rainbowColor;
}

function NameWithScore({ name, score, delta }) {
  const deltaText = typeof delta === 'number' ? (delta >= 0 ? `+${delta}` : `${delta}`) : null;
  const deltaColor = deltaText && deltaText.startsWith('+') ? colors.ok || '#2e7d32' : '#C62828';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, marginRight: 8 }}>{name}</Text>
      <Text style={{ color: colors.sub, fontSize: 16 }}>
        {score ?? 0} {deltaText ? <Text style={{ color: deltaColor }}> {deltaText}</Text> : null}
      </Text>
    </View>
  );
}

function OpponentBoard({ board, hidden, topRef, midRef, botRef, onTopLayout, onMidLayout, onBotLayout, topAnchorRef, midAnchorRef, botAnchorRef, isFouled, inFantasyland }) {
  const tiny = true;
  const rainbowColor = useRainbowGlow();
      const capRow = (ref, onLayout, anchorRef, cards, cap, rowOffset = 0) => (
      <View ref={ref} onLayout={onLayout} style={{ 
        flexDirection: "row", 
        alignSelf: "center", 
        marginBottom: 2, 
        position: 'relative',
        // Rainbow glow for Fantasy Land
        ...(inFantasyland && {
          shadowColor: rainbowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 8,
          elevation: 8,
        })
      }}>
        {/* top-right anchor marker inside the row */}
        <View ref={anchorRef} pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: 1, height: 1 }} />
        {Array.from({ length: cap }).map((_, i) => {
          const foulStyle = isFouled ? getFoulTransform(rowOffset + i) : {};
          return (
            <View key={"opp_"+i} style={[{ marginRight: 3 }, foulStyle]}>
              {hidden ? (
                <Animated.View style={{ 
                  width: 40, 
                  height: 56, 
                  borderRadius: 8, 
                  borderWidth: 2, 
                  borderColor: inFantasyland ? rainbowColor : colors.outline, 
                  backgroundColor: colors.panel2 
                }} />
              ) : (
                cards[i] ? <Card card={cards[i]} tiny noMargin /> : <View style={{ width: 40, height: 56 }} />
              )}
            </View>
          );
        })}
      </View>
    );
  return (
    <View style={{ paddingVertical: 4 }}>
      {capRow(topRef, onTopLayout, topAnchorRef, board.top || [], 3, 0)}
      {capRow(midRef, onMidLayout, midAnchorRef, board.middle || [], 5, 3)}
      {capRow(botRef, onBotLayout, botAnchorRef, board.bottom || [], 5, 8)}
      

    </View>
  );
}

function ScoreBubbles({ show, playerAnchors, oppAnchors, detail }) {
  if (!show || !detail) return null;
  const a = detail.a, b = detail.b;
  const BUBBLE_W = 24, BUBBLE_H = 20;
  const bubbleAtPoint = (pt, val, key) => {
    if (!pt) return null;
    // Center the bubble on the exact top-right corner so it sits diagonally over the tip
    const left = pt.x - BUBBLE_W / 2;
    const top = pt.y - BUBBLE_H / 2;
    return (
      <View key={key} pointerEvents="none" style={{ position: 'absolute', left, top }}>
        <View style={{ width: BUBBLE_W, height: BUBBLE_H, borderRadius: 6, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 12 }}>{val >= 0 ? `+${val}` : val}</Text>
        </View>
      </View>
    );
  };

  const mkVals = (d) => ({
    top: (d.lines.top || 0) + (d.royaltiesBreakdown?.top || 0),
    middle: (d.lines.middle || 0) + (d.royaltiesBreakdown?.middle || 0),
    bottom: (d.lines.bottom || 0) + (d.royaltiesBreakdown?.bottom || 0),
  });
  const av = mkVals(a), bv = mkVals(b);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      {bubbleAtPoint(playerAnchors.top, av.top, 'pt')}
      {bubbleAtPoint(playerAnchors.middle, av.middle, 'pm')}
      {bubbleAtPoint(playerAnchors.bottom, av.bottom, 'pb')}
      {bubbleAtPoint(oppAnchors.top, bv.top, 'ot')}
      {bubbleAtPoint(oppAnchors.middle, bv.middle, 'om')}
      {bubbleAtPoint(oppAnchors.bottom, bv.bottom, 'ob')}
    </View>
  );
}

export default function Play({ route }) {
  const { roomId } = route.params || {};
  

  
  // Use specific selectors to prevent unnecessary re-renders
  const board = useGame(state => state.board);
  const hand = useGame(state => state.hand);
  const staged = useGame(state => state.staged);
  const players = useGame(state => state.players);
  const reveal = useGame(state => state.reveal);
  const discards = useGame(state => state.discards);
  const nextRoundReady = useGame(state => state.nextRoundReady);
  const inFantasyland = useGame(state => state.inFantasyland);
  const currentRound = useGame(state => state.currentRound);
  
  // Get functions that don't change
  const { applyEvent, setPlacement, unstage, commitTurnLocal } = useGame();
  
  // Compute derived values
  const turnCap = useGame(state => {
    if (state.inFantasyland) {
      return 13; // Fantasyland: place 13 cards
    }
    // Normal mode: round 1 = 5 cards, rounds 2-5 = 2 cards
    const isRound1 = state.currentRound === 1;
    return isRound1 ? 5 : 2;
  });
  
  const canCommit = useGame(state => {
    if (state.inFantasyland) {
      return state.staged.placements.length === 13;
    }
    // Normal mode: round 1 = 5 cards, rounds 2-5 = 2 cards
    const isRound1 = state.currentRound === 1;
    const required = isRound1 ? 5 : 2;
    return state.staged.placements.length === required;
  });



  const { drag } = useDrag();

  const [readyPlayers, setReadyPlayers] = useState(new Set());
  const [forceUpdate, setForceUpdate] = useState(0);

  // measure rows for hover/drop (player)
  const topRef = useRef(null), midRef = useRef(null), botRef = useRef(null);
  const topAnchorRef = useRef(null), midAnchorRef = useRef(null), botAnchorRef = useRef(null);
  const [playerAnchors, setPlayerAnchors] = useState({ top: null, middle: null, bottom: null });
  const [hover, setHover] = useState(null); // 'top' | 'middle' | 'bottom' | null
  const [showDiscards, setShowDiscards] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [scoreDetail, setScoreDetail] = useState(null);

  // measure rows for opponent
  const oTopRef = useRef(null), oMidRef = useRef(null), oBotRef = useRef(null);
  const oTopAnchorRef = useRef(null), oMidAnchorRef = useRef(null), oBotAnchorRef = useRef(null);
  const [oppAnchors, setOppAnchors] = useState({ top: null, middle: null, bottom: null });

  function measureAnchor(ref, key, setter) {
    const node = findNodeHandle(ref.current);
    if (!node) return;
    UIManager.measureInWindow(node, (x, y) => setter((s) => ({ ...s, [key]: { x, y } })));
  }

  const onTopLayout = () => { measureAnchor(topAnchorRef, 'top', setPlayerAnchors); onRowTopLayoutZone(); };
  const onMidLayout = () => { measureAnchor(midAnchorRef, 'middle', setPlayerAnchors); onRowMidLayoutZone(); };
  const onBotLayout = () => { measureAnchor(botAnchorRef, 'bottom', setPlayerAnchors); onRowBotLayoutZone(); };

  const onOTopLayout = () => measureAnchor(oTopAnchorRef, 'top', setOppAnchors);
  const onOMidLayout = () => measureAnchor(oMidAnchorRef, 'middle', setOppAnchors);
  const onOBotLayout = () => measureAnchor(oBotAnchorRef, 'bottom', setOppAnchors);





  useEffect(() => {
    console.log('🎯 Socket event useEffect running');
    const off = onSocketEvent((evt, data) => {
      console.log('🎯 Socket event received:', evt);
      
      if (evt === "round:start") {
        playSfx('roundstart');
        // Clear previous reveal/score UI when a new round begins
        setShowScore(false);
        setScoreDetail(null);
      }
      if (evt === 'round:reveal') {
        const meId = useGame.getState().userId;
        const pair = data?.pairwise?.find(p => p.aUserId === meId || p.bUserId === meId);
        if (pair) {
          const scoreDetail = { a: pair.aUserId === meId ? pair.a : pair.b, b: pair.aUserId === meId ? pair.b : pair.a };
          setScoreDetail(scoreDetail);
          setShowScore(true); // persist until next round
        }
      }
      if (evt === 'action:ready') {
        // Add player to ready set
        const meId = useGame.getState().userId;
        const committingPlayerId = data?.userId;
        
        setReadyPlayers(prev => {
          const newSet = new Set(prev);
          newSet.add(committingPlayerId);
          return newSet;
        });
      }
      if (evt === 'action:applied' && data?.autoCommitted) {
        // Handle auto-commit punishment
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      

      
      applyEvent(evt, data);
    });
    return () => off();
  }, []); // Remove applyEvent from dependencies to prevent infinite re-renders

  useEffect(() => {
    const t = setTimeout(() => {
      onTopLayout(); onMidLayout(); onBotLayout();
      onOTopLayout(); onOMidLayout(); onOBotLayout();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // split staged by row
  const stagedTop    = useMemo(() => staged.placements.filter(p => p.row === "top").map(p => p.card), [staged]);
  const stagedMiddle = useMemo(() => staged.placements.filter(p => p.row === "middle").map(p => p.card), [staged]);
  const stagedBottom = useMemo(() => staged.placements.filter(p => p.row === "bottom").map(p => p.card), [staged]);

  // cards available
  const visibleHand = useMemo(() => {
    const taken = new Set([
      ...board.top, ...board.middle, ...board.bottom,
      ...staged.placements.map(p => p.card),
    ]);
    if (staged.discard) taken.add(staged.discard);
    const result = hand.filter(c => !taken.has(c));
    console.log('🎯 visibleHand calculated - inFantasyland:', inFantasyland, 'hand.length:', hand.length, 'result.length:', result.length);
    return result;
  }, [hand, board.top, board.middle, board.bottom, staged.placements, staged.discard, inFantasyland]);

  // opponent
  const meId = useGame(state => state.userId);
  const me = useMemo(() => players.find(p => p.userId === meId) || { name: 'You', score: 0 }, [players, meId]);
  const others = useMemo(() => players.filter(p => p.userId !== meId), [players, meId]);
  const opponent = useMemo(() => {
    return others[0] || null;
  }, [others]);
  const opponentBoard = useMemo(() => {
    if (!reveal) return { top: [], middle: [], bottom: [] };
    const opp = reveal.boards?.find(b => b.userId === opponent?.userId);
    return opp?.board || { top: [], middle: [], bottom: [] };
  }, [reveal, opponent]);

  // hit-test helpers
  function inRect(r, x, y, pad = 36) {
    if (!r) return false;
    return x >= r.x - pad && x <= r.x + r.width + pad && y >= r.y - pad && y <= r.y + r.height + pad;
  }
  function zoneAt(x, y) {
    // Using player row zones for drag only
    const zones = {
      top: topRef.current ? playerAnchors.top && { x: 0, y: 0 } : null,
    };
    return null; // not used here; kept previous logic below
  }



  // Keep previous drop logic using old measurement helpers
  function inRectOld(r, x, y, pad = 36) {
    if (!r) return false;
    return x >= r.x - pad && x <= r.x + r.width + pad && y >= r.y - pad && y <= r.y + r.height + pad;
  }
  function zoneAtOld(x, y) {
    const zones = measureZonesRef.current;
    if (inRectOld(zones.top, x, y)) return "top";
    if (inRectOld(zones.middle, x, y)) return "middle";
    if (inRectOld(zones.bottom, x, y)) return "bottom";
    return null;
  }
  // Maintain old zones for drag-drop hit testing
  const measureZonesRef = useRef({ top: null, middle: null, bottom: null });
  function measureRowZone(ref, key) {
    const node = findNodeHandle(ref.current);
    if (!node) return;
    UIManager.measureInWindow(node, (x, y, width, height) => {
      measureZonesRef.current = { ...measureZonesRef.current, [key]: { x, y, width, height } };
    });
  }
  const onRowTopLayoutZone = () => measureRowZone(topRef, 'top');
  const onRowMidLayoutZone = () => measureRowZone(midRef, 'middle');
  const onRowBotLayoutZone = () => measureRowZone(botRef, 'bottom');

  useEffect(() => {
    const t = setTimeout(() => {
      onRowTopLayoutZone(); onRowMidLayoutZone(); onRowBotLayoutZone();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const onDrop = ({ card, pageX, pageY }) => {
    console.log('🎯 onDrop called - inFantasyland:', inFantasyland, 'card:', card);
    const z = zoneAtOld(pageX, pageY) || null;
    console.log('🎯 Drop zone:', z);
    if (z === "top")    { console.log('🎯 Placing card in top'); setPlacement("top", card); Haptics.selectionAsync(); playSfx('place'); return; }
    if (z === "middle") { console.log('🎯 Placing card in middle'); setPlacement("middle", card); Haptics.selectionAsync(); playSfx('place'); return; }
    if (z === "bottom") { console.log('🎯 Placing card in bottom'); setPlacement("bottom", card); Haptics.selectionAsync(); playSfx('place'); return; }
    console.log('🎯 No valid zone, unstaging card');
    return unstage(card);
  };

  const onCommit = () => {
    if (!canCommit) return;
    const state = useGame.getState();
    const { currentDeal, userId, inFantasyland } = state;
    const placedSet = new Set(staged.placements.map(p => p.card));
    
    let leftover = null;
    if (!inFantasyland) {
      // Normal mode: auto-discard leftover card
      leftover = (currentDeal || []).find(c => !placedSet.has(c)) || null;
    }
    // In fantasyland mode: no discards (1 card stays in hand)

    emit("action:ready", { roomId, placements: staged.placements, discard: inFantasyland ? undefined : (leftover || undefined), userId });
    playSfx('commit');
    commitTurnLocal(leftover);
    
    // Add myself to ready set
    setReadyPlayers(prev => {
      const newSet = new Set(prev);
      newSet.add(userId);
      return newSet;
    });
  };



  // Handle server timer updates
  useEffect(() => {
    const off = onSocketEvent((evt, data) => {
      if (evt === "timer:update") {
        setServerTimeLeft(data.timeLeft);
        setIsTimerActive(data.isActive);
      }
      if (evt === "timer:start") {
        // Store the total duration when timer starts
        const duration = data.timeLeft || (TIMER_DURATION * 1000);
        setTotalTimerDuration(duration);
        setServerTimeLeft(duration);
        setIsTimerActive(true);
        setReadyPlayers(new Set());
      }
      if (evt === "timer:stop") {
        setIsTimerActive(false);
      }
    });
    return () => off();
  }, []);

  // Debug: Monitor board state changes






  const needed = inFantasyland ? 13 : (committedTotal(board) === 0 ? 5 : 2);
  const stagedCount = staged.placements.length;
  const canPress = stagedCount === needed;
  
  // console.log('🎯 Render - inFantasyland:', inFantasyland, 'needed:', needed, 'stagedCount:', stagedCount, 'canPress:', canPress);





  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} pointerEvents="box-none">
      <BackButton title="" />
      {/* Opponent area */}
      <View style={{ paddingTop: 80, paddingHorizontal: 12 }}>
        {others[0] ? (
          <View style={{ alignItems: "center" }}>
            <NameWithScore name={others[0].name} score={others[0].score} delta={reveal?.results?.[others[0].userId]} />
          </View>
        ) : null}
        <OpponentBoard
          board={opponentBoard}
          hidden={!reveal}
          topRef={oTopRef}
          midRef={oMidRef}
          botRef={oBotRef}
          onTopLayout={onOTopLayout}
          onMidLayout={onOMidLayout}
          onBotLayout={onOBotLayout}
          topAnchorRef={oTopAnchorRef}
          midAnchorRef={oMidAnchorRef}
          botAnchorRef={oBotAnchorRef}
          isFouled={showScore && scoreDetail?.b?.foul}
          inFantasyland={others[0]?.inFantasyland || false}
        />


      </View>

      {/* Player board and hand area */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={{ alignSelf: "center", marginBottom: 8 }}>
          <NameWithScore name={me.name || 'You'} score={me.score} delta={reveal?.results?.[me.userId]} />
          {currentRound && (
            <Text style={{ 
              textAlign: 'center', 
              color: colors.sub, 
              fontSize: 14, 
              marginTop: 4 
            }}>
              Round {currentRound} {inFantasyland ? '(Fantasy Land)' : ''}
            </Text>
          )}
        </View>
        <View style={{ alignSelf: "center", height: BOARD_HEIGHT, paddingHorizontal: 6, justifyContent: "center" }}>
          {/* Player rows with in-row anchors */}
          <Row
            capacity={3}
            committed={board.top}
            staged={stagedTop}
            zoneRef={topRef}
            highlightRow={hover === "top"}
            onDrop={onDrop}
            onLayout={onTopLayout}
            compact
            anchorRef={topAnchorRef}
            isFouled={showScore && scoreDetail?.a?.foul}
            rowOffset={0}
            inFantasyland={inFantasyland}
          />
          <Row
            capacity={5}
            committed={board.middle}
            staged={stagedMiddle}
            zoneRef={midRef}
            highlightRow={hover === "middle"}
            onDrop={onDrop}
            onLayout={onMidLayout}
            compact
            anchorRef={midAnchorRef}
            isFouled={showScore && scoreDetail?.a?.foul}
            rowOffset={3}
            inFantasyland={inFantasyland}
          />
          <Row
            capacity={5}
            committed={board.bottom}
            staged={stagedBottom}
            zoneRef={botRef}
            highlightRow={hover === "bottom"}
            onDrop={onDrop}
            onLayout={onBotLayout}
            compact
            anchorRef={botAnchorRef}
            isFouled={showScore && scoreDetail?.a?.foul}
            rowOffset={8}
            inFantasyland={inFantasyland}
          />
        </View>
        


        <View style={{ 
          paddingHorizontal: 6, 
          marginTop: 12, 
          height: inFantasyland ? HAND_HEIGHT * 2 : HAND_HEIGHT, 
          justifyContent: "center" 
        }}>
          {inFantasyland ? (
            // Always 2 rows of 7 cards for fantasyland with minimal spacing
            <View style={{ flex: 1, justifyContent: "center" }}>
              <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 1 }}>
                {visibleHand.slice(0, 7).map((card, index) => (
                  <View key={card + ":" + index} style={{ marginRight: 1 }} pointerEvents="box-none">
                    <DraggableCard card={card} small onDrop={onDrop} />
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", justifyContent: "center" }}>
                {visibleHand.slice(7, 14).map((card, index) => (
                  <View key={card + ":" + (index + 7)} style={{ marginRight: 1 }} pointerEvents="box-none">
                    <DraggableCard card={card} small onDrop={onDrop} />
                  </View>
                ))}
              </View>
            </View>
          ) : (
            // Single row for normal hands
            <FlatList
              data={visibleHand}
              horizontal
              scrollEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(c, i) => c + ":" + i}
              renderItem={({ item }) => (
                <View style={{ marginRight: SLOT_GAP }} pointerEvents="box-none">
                  <DraggableCard card={item} small onDrop={onDrop} />
                </View>
              )}
              contentContainerStyle={{ 
                paddingVertical: 2, 
                justifyContent: "center", 
                alignItems: "center",
                minWidth: "100%"
              }}
              getItemLayout={(data, index) => ({
                length: SLOT_W + SLOT_GAP,
                offset: (SLOT_W + SLOT_GAP) * index,
                index,
              })}
            />
          )}
        </View>

        {/* Spacer to keep room for pinned controls */}
        <View style={{ height: CONTROLS_HEIGHT }} />
      </View>

      {/* Controls pinned to bottom (never moves) */}
              <View style={{ position: "absolute", left: 0, right: 0, bottom: 16, paddingHorizontal: 24, paddingBottom: 12, paddingTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {/* Left: Discard button */}
          <Pressable
            onPressIn={() => setShowDiscards(true)}
            onPressOut={() => setShowDiscards(false)}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.panel2,
              borderWidth: 1,
              borderColor: colors.outline,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 24 }}>🗑️</Text>
          </Pressable>

          {/* Center: NEXT ROUND button (only when reveal is active) */}
          {reveal ? (
            <Pressable
              onPress={() => {
                emit("round:start", { roomId });
              }}
              disabled={nextRoundReady.has(meId)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 25,
                backgroundColor: nextRoundReady.has(meId) ? colors.outline : "#2e7d32",
                borderWidth: nextRoundReady.has(meId) ? 1 : 0,
                borderColor: colors.outline,
                minWidth: 140,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ 
                color: nextRoundReady.has(meId) ? colors.sub : "#fff", 
                fontSize: 16, 
                fontWeight: "600" 
              }}>
                {nextRoundReady.has(meId) ? "WAITING..." : "NEXT ROUND"}
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 140 }} />
          )}

          {/* Right: Ready/Set button */}
          <Pressable
            onPress={onCommit}
            disabled={!canPress}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: canPress ? "#2e7d32" : colors.outline,
              borderWidth: canPress ? 0 : 1,
              borderColor: colors.outline,
            }}
          >
            <Text style={{ color: canPress ? "#fff" : colors.sub, fontSize: 28 }}>✓</Text>
          </Pressable>
        </View>

        {showDiscards && (
          <View style={{ 
            position: "absolute", 
            left: 80, 
            bottom: 0, 
            flexDirection: "row",
            flexWrap: "wrap",
            alignSelf: "center"
          }}>
            {discards.map((c, i) => (
              <View key={c+":"+i} style={{ marginRight: 4, marginBottom: 4 }}>
                <Card card={c} micro noMargin />
              </View>
            ))}
          </View>
        )}
      </View>





      {/* Row score bubbles positioned at row corners */}
      <ScoreBubbles show={showScore} playerAnchors={playerAnchors} oppAnchors={oppAnchors} detail={scoreDetail} />
      


      {/* Scoop badges - absolutely positioned to not affect layout */}
      {showScore && scoreDetail?.a?.scoop > 0 && (
        <View style={{
          position: 'absolute',
          left: '50%',
          top: '75%',
          transform: [{ translateX: '-50%' }],
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          <View style={{ 
            paddingVertical: 6, 
            paddingHorizontal: 12, 
            borderRadius: 8, 
            borderWidth: 1, 
            borderColor: colors.outline, 
            backgroundColor: colors.panel2 
          }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>SCOOPED +3</Text>
          </View>
        </View>
      )}

      {showScore && scoreDetail?.b?.scoop > 0 && (
        <View style={{
          position: 'absolute',
          left: '50%',
          top: '32%',
          transform: [{ translateX: '-50%' }],
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          <View style={{ 
            paddingVertical: 4, 
            paddingHorizontal: 8, 
            borderRadius: 6, 
            borderWidth: 1, 
            borderColor: colors.outline, 
            backgroundColor: colors.panel2 
          }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>SCOOPED +3</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function Row({
  capacity,
  committed,
  staged,
  zoneRef,
  highlightRow,
  onDrop,
  onLayout,
  compact = false,
  anchorRef,
  isFouled = false,
  rowOffset = 0,
  inFantasyland = false,
}) {
  const committedCount = committed.length;
  const stagedCount = staged.length;
  const remaining = Math.max(0, capacity - committedCount - stagedCount);
  const gap = compact ? 2 : SLOT_GAP;
  const rainbowColor = useRainbowGlow();

  return (
    <View style={{ marginBottom: ROW_GAP }} pointerEvents="box-none">
      <View
        ref={zoneRef}
        onLayout={onLayout}
        pointerEvents="box-none"
        style={{
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 0,
          borderRadius: 8,
          borderWidth: highlightRow ? 2 : 0,
          borderColor: highlightRow ? colors.accent : "transparent",
          position: 'relative',
          // Rainbow glow for Fantasy Land
          ...(inFantasyland && {
            shadowColor: rainbowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 8,
            elevation: 8,
          })
        }}
      >
        {/* top-right anchor inside player row */}
        {anchorRef ? <View ref={anchorRef} pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: 1, height: 1 }} /> : null}
        {committed.map((c, i) => {
          const foulStyle = isFouled ? getFoulTransform(rowOffset + i) : {};
          return (
            <View key={"c_"+i} style={[{ marginRight: gap }, foulStyle]} pointerEvents="none">
              <Card card={c} small noMargin />
            </View>
          );
        })}
        {staged.map((c, i) => (
          <View key={"s_"+i} style={{ marginRight: gap }} pointerEvents="box-none">
                            <DraggableCard card={c} small onDrop={onDrop} />
          </View>
        ))}
        {Array.from({ length: remaining }).map((_, i) => (
          <Animated.View
            key={"p_"+i}
            style={{
              width: SLOT_W,
              height: SLOT_H,
              marginRight: gap,
              borderWidth: 2,
              borderColor: inFantasyland ? rainbowColor : (highlightRow ? colors.accent : colors.outline),
              borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
            pointerEvents="none"
          />
        ))}
      </View>
    </View>
  );
}
