import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";

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
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { SERVER_URL } from "../config/env";

// Responsive design system
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calculate responsive dimensions based on screen size
const getResponsiveDimensions = () => {
  const isSmallDevice = screenWidth < 375; // iPhone SE, small Android
  const isMediumDevice = screenWidth >= 375 && screenWidth < 414; // iPhone 12, 13, 14
  const isLargeDevice = screenWidth >= 414; // iPhone 12/13/14 Pro Max, large Android
  
  // Calculate card sizes based on screen size - opponent board smaller, player board larger
  const opponentCardWidthPercent = 0.11; // 11% of screen width for opponent board (smaller, just for viewing)
  const playerCardWidthPercent = 0.1425; // 14.25% of screen width for player board (larger, for interaction)
  
  const opponentBaseSlotW = Math.min(Math.max(screenWidth * opponentCardWidthPercent, 30), 60);
  const playerBaseSlotW = Math.min(Math.max(screenWidth * playerCardWidthPercent, 45), 90);
  
  const opponentBaseSlotH = Math.floor(opponentBaseSlotW * 1.4); // Proper playing card height
  const playerBaseSlotH = Math.floor(playerBaseSlotW * 1.4); // Proper playing card height
  
  const OPPONENT_SLOT_W = Math.floor(opponentBaseSlotW * 0.975); // 2.5% smaller
  const OPPONENT_SLOT_H = Math.floor(opponentBaseSlotH * 0.975); // 2.5% smaller
  const SLOT_W = Math.floor(playerBaseSlotW * 0.975); // 2.5% smaller
  const SLOT_H = Math.floor(playerBaseSlotH * 0.975); // 2.5% smaller
  
  // Responsive gaps based on screen size
  const gapPercent = 0.005; // 0.5% of screen width (reduced from 1%)
  const SLOT_GAP = Math.min(Math.max(screenWidth * gapPercent, 1), 2); // Min 1px, Max 2px (reduced from 3px)
  const ROW_GAP = Math.min(Math.max(screenWidth * 0.002, 1), 2); // 0.2% of screen width, Min 1px, Max 2px
  
  // Smaller gaps for opponent board (more compact)
  const opponentGapPercent = 0.005; // 0.5% of screen width (half the normal gap)
  const OPPONENT_SLOT_GAP = Math.min(Math.max(screenWidth * opponentGapPercent, 1), 2); // Min 1px, Max 2px
  const OPPONENT_ROW_GAP = Math.min(Math.max(screenWidth * 0.002, 1), 2); // 0.2% of screen width, Min 1px, Max 2px
  
  // Tighter gaps for hand cards (especially fantasyland with 7 cards)
  const handGapPercent = 0.0001; // 0.01% of screen width (tiny gap)
  const HAND_GAP = Math.min(Math.max(screenWidth * handGapPercent, 0), 1); // Min 0px, Max 1px
  
  // Responsive board and control heights
  const BOARD_HEIGHT = SLOT_H * 3 + ROW_GAP * 2;
  
  // Responsive control heights based on screen size
  const controlHeightPercent = 0.08; // 8% of screen height
  const CONTROLS_HEIGHT = Math.min(Math.max(screenHeight * controlHeightPercent, 60), 100); // Min 60px, Max 100px
  
  // Responsive hand height
  const handHeightPercent = 0.15; // 15% of screen height
  const HAND_HEIGHT = Math.min(Math.max(screenHeight * handHeightPercent, 80), 120); // Min 80px, Max 120px
  
  // Responsive padding and margins
  const paddingPercent = 0.04; // 4% of screen width
  const HORIZONTAL_PADDING = Math.min(Math.max(screenWidth * paddingPercent, 12), 24); // Min 12px, Max 24px
  
  // Responsive font sizes
  const fontSizePercent = 0.04; // 4% of screen width
  const BASE_FONT_SIZE = Math.min(Math.max(screenWidth * fontSizePercent, 12), 18); // Min 12px, Max 18px
  const LARGE_FONT_SIZE = Math.min(Math.max(screenWidth * fontSizePercent * 1.2, 14), 22); // Min 14px, Max 22px
  const SMALL_FONT_SIZE = Math.min(Math.max(screenWidth * fontSizePercent * 0.8, 10), 16); // Min 10px, Max 16px
  
  // Responsive spacing for different screen sections
  const sectionSpacingPercent = 0.06; // 6% of screen height
  const SECTION_SPACING = Math.min(Math.max(screenHeight * sectionSpacingPercent, 40), 80); // Min 40px, Max 80px
  
  // Responsive control button dimensions
  const controlButtonPercent = 0.13; // 13% of screen width
  const CONTROL_BUTTON_SIZE = Math.min(Math.max(screenWidth * controlButtonPercent, 55), 90); // Min 55px, Max 90px
  const CONTROL_BUTTON_RADIUS = CONTROL_BUTTON_SIZE / 2;
  
  // Responsive text sizes for controls
  const controlTextPercent = 0.035; // 3.5% of screen width
  const CONTROL_TEXT_SIZE = Math.min(Math.max(screenWidth * controlTextPercent, 12), 18); // Min 12px, Max 18px
  const CONTROL_ICON_SIZE = Math.min(Math.max(screenWidth * controlTextPercent * 1.5, 16), 28); // Min 16px, Max 28px
  
  // Responsive button padding
  const buttonPaddingPercent = 0.02; // 2% of screen width
  const BUTTON_PADDING_H = Math.min(Math.max(screenWidth * buttonPaddingPercent, 8), 16); // Min 8px, Max 16px
  const BUTTON_PADDING_V = Math.min(Math.max(screenHeight * buttonPaddingPercent * 0.5, 6), 12); // Min 6px, Max 12px
  
  return {
    SLOT_W,
    SLOT_H,
    OPPONENT_SLOT_W,
    OPPONENT_SLOT_H,
    SLOT_GAP,
    ROW_GAP,
    OPPONENT_SLOT_GAP,
    OPPONENT_ROW_GAP,
    HAND_GAP,
    BOARD_HEIGHT,
    CONTROLS_HEIGHT,
    HAND_HEIGHT,
    HORIZONTAL_PADDING,
    BASE_FONT_SIZE,
    LARGE_FONT_SIZE,
    SMALL_FONT_SIZE,
    SECTION_SPACING,
    CONTROL_BUTTON_SIZE,
    CONTROL_BUTTON_RADIUS,
    CONTROL_TEXT_SIZE,
    CONTROL_ICON_SIZE,
    BUTTON_PADDING_H,
    BUTTON_PADDING_V,
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
    screenWidth,
    screenHeight
  };
};

// Get responsive dimensions (fallback for functions outside component)
const responsive = getResponsiveDimensions();


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





function NameWithScore({ name, score, delta, tableChips, isRanked, scoreDetail, isPlayer, animationStep = 0, inFantasyland = false }) {
  // Calculate point difference for this player
  let pointDelta = null;
  if (scoreDetail && isPlayer !== undefined) {
    const playerData = isPlayer ? scoreDetail.a : scoreDetail.b;
    const opponentData = isPlayer ? scoreDetail.b : scoreDetail.a;
    const playerTotal = getTotalScore(playerData);
    const opponentTotal = getTotalScore(opponentData);
    pointDelta = playerTotal - opponentTotal;
  }

  // For ranked matches, show chips instead of score
  if (isRanked) {
    const chipText = `${tableChips || 500}`;
    const chipDeltaText = typeof delta === 'number' ? (delta >= 0 ? `+${delta * 10}` : `${delta * 10}`) : null;
    const chipDeltaColor = chipDeltaText && chipDeltaText.startsWith('+') ? colors.ok || '#2e7d32' : '#C62828';
    const pointDeltaText = pointDelta !== null ? (pointDelta >= 0 ? `+${pointDelta}` : `${pointDelta}`) : null;
    const pointDeltaColor = pointDeltaText && pointDeltaText.startsWith('+') ? colors.ok || '#2e7d32' : '#C62828';
    
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4, position: 'relative' }}>
        {inFantasyland && <Text style={{ fontSize: responsive.LARGE_FONT_SIZE, marginRight: 4 }}>🌈</Text>}
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: responsive.LARGE_FONT_SIZE, marginRight: 8 }}>{name}</Text>
        <Text style={{ color: colors.sub, fontSize: responsive.BASE_FONT_SIZE }}>
          {chipText} 
          <Image 
            source={require('../../assets/images/chips.png')} 
            style={{ 
              width: responsive.BASE_FONT_SIZE * 1.2, 
              height: responsive.BASE_FONT_SIZE * 1.2,
              marginLeft: 4
            }} 
          />

        </Text>
        
        {/* Chip Change Indicator - appears at step 5 */}
        {animationStep >= 5 && chipDeltaText && (
          <View style={{
            position: 'absolute',
            right: -8,
            top: '50%',
            transform: [{ translateY: -10 }],
            backgroundColor: chipDeltaColor,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
            zIndex: 1000,
          }}>
            <Text style={{ 
              color: colors.text, 
              fontSize: 10, 
              fontWeight: '700' 
            }}>
              {chipDeltaText}
            </Text>
          </View>
        )}
      </View>
    );
  } else {
    // For regular matches, show score as before
    const deltaText = typeof delta === 'number' ? (delta >= 0 ? `+${delta}` : `${delta}`) : null;
    const deltaColor = deltaText && deltaText.startsWith('+') ? colors.ok || '#2e7d32' : '#C62828';
    const pointDeltaText = pointDelta !== null ? (pointDelta >= 0 ? `+${pointDelta}` : `${pointDelta}`) : null;
    const pointDeltaColor = pointDeltaText && pointDeltaText.startsWith('+') ? colors.ok || '#2e7d32' : '#C62828';
    
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4, position: 'relative' }}>
        {inFantasyland && <Text style={{ fontSize: responsive.LARGE_FONT_SIZE, marginRight: 4 }}>🌈</Text>}
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: responsive.LARGE_FONT_SIZE, marginRight: 8 }}>{name}</Text>
        <Text style={{ color: colors.sub, fontSize: responsive.BASE_FONT_SIZE }}>
          {score ?? 0} {deltaText ? <Text style={{ color: deltaColor }}> {deltaText}</Text> : null}
        </Text>
      </View>
    );
  }
}

// Timer Bar Component
function TimerBar({ timer, responsive }) {
  const [progress, setProgress] = useState(0);
  const animatedWidth = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (timer.isActive && timer.deadlineEpochMs) {
      const updateProgress = () => {
        const now = Date.now();
        const timeLeft = Math.max(0, timer.deadlineEpochMs - now);
        const newProgress = Math.min(1, Math.max(0, timeLeft / timer.durationMs));
        setProgress(newProgress);
        
        // Animate the width (newProgress is 1 when full time, 0 when no time)
        Animated.timing(animatedWidth, {
          toValue: newProgress,
          duration: 100, // Smooth animation
          useNativeDriver: false,
        }).start();
      };
      
      // Update immediately
      updateProgress();
      
      // Update every 100ms for smooth animation
      const interval = setInterval(updateProgress, 100);
      
      return () => clearInterval(interval);
    } else {
      // Reset when timer is not active
      setProgress(0);
      Animated.timing(animatedWidth, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [timer.isActive, timer.deadlineEpochMs, timer.durationMs]);
  
  // Don't render if timer is not active
  if (!timer.isActive) return null;
  
  // Calculate color based on progress (progress now represents remaining time)
  const getTimerColor = () => {
    if (progress > 0.25) return '#FFD700'; // Yellow (100-25% remaining)
    return '#FF4444'; // Red (25-0% remaining)
  };
  
  return (
    <View style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: 'rgba(0,0,0,0.1)',
      zIndex: 1000,
    }}>
      <Animated.View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: animatedWidth.interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', '100%'], // 0 = empty, 1 = full
        }),
        backgroundColor: getTimerColor(),
        borderRadius: 2,
      }} />
    </View>
  );
}

function OpponentBoard({ board, hidden, topRef, midRef, botRef, onTopLayout, onMidLayout, onBotLayout, topAnchorRef, midAnchorRef, botAnchorRef, isFouled, inFantasyland, responsive, showScore = false, scoreDetail = null, animationStep = 0 }) {
  const tiny = true;
  
  // Responsive opponent card dimensions (using opponent-specific sizing)
  const oppCardWidth = responsive.OPPONENT_SLOT_W;
  const oppCardHeight = responsive.OPPONENT_SLOT_H;
  
  return (
    <View style={{ paddingVertical: 4 }}>
      {/* Top Row */}
      <View ref={topRef} onLayout={onTopLayout} style={{ 
        flexDirection: "row", 
        alignSelf: "center", 
        marginBottom: responsive.OPPONENT_ROW_GAP, 
        position: 'relative'
      }}>
        <View ref={topAnchorRef} pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: 1, height: 1 }} />
        {Array.from({ length: 3 }).map((_, i) => {
          const foulStyle = isFouled ? getFoulTransform(i) : {};
          return (
            <View key={"opp_top_"+i} style={[{ marginRight: responsive.OPPONENT_SLOT_GAP }, foulStyle]}>
              {hidden ? (
                <Animated.View style={{ 
                  width: oppCardWidth, 
                  height: oppCardHeight, 
                  borderRadius: 6, 
                  borderWidth: 1.5, 
                  borderColor: colors.outline, 
                  backgroundColor: colors.panel2 
                }} />
              ) : (
                board.top[i] ? <Card card={board.top[i]} tiny noMargin responsive={responsive} /> : <View style={{ width: oppCardWidth, height: oppCardHeight }} />
              )}
            </View>
          );
        })}
        

      </View>

      {/* Middle Row */}
      <View ref={midRef} onLayout={onMidLayout} style={{ 
        flexDirection: "row", 
        alignSelf: "center", 
        marginBottom: responsive.OPPONENT_ROW_GAP, 
        position: 'relative'
      }}>
        <View ref={midAnchorRef} pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: 1, height: 1 }} />
        {Array.from({ length: 5 }).map((_, i) => {
          const foulStyle = isFouled ? getFoulTransform(3 + i) : {};
          return (
            <View key={"opp_mid_"+i} style={[{ marginRight: responsive.OPPONENT_SLOT_GAP }, foulStyle]}>
              {hidden ? (
                <Animated.View style={{ 
                  width: oppCardWidth, 
                  height: oppCardHeight, 
                  borderRadius: 6, 
                  borderWidth: 1.5, 
                  borderColor: colors.outline, 
                  backgroundColor: colors.panel2 
                }} />
              ) : (
                board.middle[i] ? <Card card={board.middle[i]} tiny noMargin responsive={responsive} /> : <View style={{ width: oppCardWidth, height: oppCardHeight }} />
              )}
            </View>
          );
        })}
        

      </View>

      {/* Bottom Row */}
      <View ref={botRef} onLayout={onBotLayout} style={{ 
        flexDirection: "row", 
        alignSelf: "center", 
        marginBottom: responsive.OPPONENT_ROW_GAP, 
        position: 'relative'
      }}>
        <View ref={botAnchorRef} pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: 1, height: 1 }} />
        {Array.from({ length: 5 }).map((_, i) => {
          const foulStyle = isFouled ? getFoulTransform(8 + i) : {};
          return (
            <View key={"opp_bot_"+i} style={[{ marginRight: responsive.OPPONENT_SLOT_GAP }, foulStyle]}>
              {hidden ? (
                <Animated.View style={{ 
                  width: oppCardWidth, 
                  height: oppCardHeight, 
                  borderRadius: 6, 
                  borderWidth: 1.5, 
                  borderColor: colors.outline, 
                  backgroundColor: colors.panel2 
                }} />
              ) : (
                board.bottom[i] ? <Card card={board.bottom[i]} tiny noMargin responsive={responsive} /> : <View style={{ width: oppCardWidth, height: oppCardHeight }} />
              )}
            </View>
          );
        })}
        

        
        {/* Total Score Overlay for Bottom */}
        {showScore && scoreDetail && animationStep >= 4 && (
          <View style={{
            position: 'absolute',
            bottom: -8,
            right: -8,
            backgroundColor: colors.panel2,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: colors.outline,
            zIndex: 1000,
          }}>
            <Text style={{ 
              color: colors.text, 
              fontSize: 14, 
              fontWeight: '700' 
            }}>
              Total: {getTotalScore(scoreDetail.b)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ScoreBubbles({ show, playerAnchors, oppAnchors, detail, animationStep }) {
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
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 999 }}>
      {animationStep >= 1 && bubbleAtPoint(playerAnchors.top, av.top, 'pt')}
      {animationStep >= 1 && bubbleAtPoint(oppAnchors.top, bv.top, 'ot')}
      {animationStep >= 2 && bubbleAtPoint(playerAnchors.middle, av.middle, 'pm')}
      {animationStep >= 2 && bubbleAtPoint(oppAnchors.middle, bv.middle, 'om')}
      {animationStep >= 3 && bubbleAtPoint(playerAnchors.bottom, av.bottom, 'pb')}
      {animationStep >= 3 && bubbleAtPoint(oppAnchors.bottom, bv.bottom, 'ob')}
    </View>
  );
}

// Detailed Scoring Overlay Component
function DetailedScoringOverlay({ show, scoreDetail, animationStep, responsive, onClose }) {
  if (!show || !scoreDetail || animationStep < 4) return null;
  
  const a = scoreDetail.a;
  const b = scoreDetail.b;
  
  // Calculate totals
  const aTotal = getTotalScore(a);
  const bTotal = getTotalScore(b);
  const difference = aTotal - bTotal;
  
  // Debug logging
  console.log('🎯 DETAILED SCORING DEBUG:', {
    a: a,
    b: b,
    aTotal,
    bTotal,
    difference,
    chipConversion: difference * 10
  });
  
  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <View style={{
        backgroundColor: colors.panel,
        borderRadius: 16,
        padding: 20,
        maxWidth: responsive.isSmallDevice ? 320 : 400,
        width: '100%',
        borderWidth: 2,
        borderColor: colors.outline
      }}>
        {/* Header */}
        <Text style={{
          color: colors.text,
          fontSize: responsive.BASE_FONT_SIZE * 1.2,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: 16
        }}>
          Score Breakdown
        </Text>
        
        {/* Line Scores Table */}
        <View style={{ marginBottom: 16 }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.outline
          }}>
            <Text style={{ color: colors.sub, fontSize: responsive.SMALL_FONT_SIZE, fontWeight: '600' }}>Line</Text>
            <Text style={{ color: colors.sub, fontSize: responsive.SMALL_FONT_SIZE, fontWeight: '600' }}>You</Text>
            <Text style={{ color: colors.sub, fontSize: responsive.SMALL_FONT_SIZE, fontWeight: '600' }}>Opponent</Text>
          </View>
          
          {/* Top Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ color: colors.text, fontSize: responsive.SMALL_FONT_SIZE }}>Top</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ 
                color: a.lines.top > 0 ? colors.ok : colors.text, 
                fontSize: responsive.SMALL_FONT_SIZE,
                fontWeight: a.lines.top > 0 ? '700' : '400'
              }}>
                {a.lines.top >= 0 ? '+' : ''}{a.lines.top}
              </Text>
              {a.royaltiesBreakdown?.top > 0 && (
                <Text style={{ 
                  color: colors.ok, 
                  fontSize: responsive.SMALL_FONT_SIZE * 0.8,
                  fontWeight: '600',
                  marginLeft: 4
                }}>
                  (+{a.royaltiesBreakdown.top})
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ 
                color: b.lines.top > 0 ? colors.ok : colors.text, 
                fontSize: responsive.SMALL_FONT_SIZE,
                fontWeight: b.lines.top > 0 ? '700' : '400'
              }}>
                {b.lines.top >= 0 ? '+' : ''}{b.lines.top}
              </Text>
              {b.royaltiesBreakdown?.top > 0 && (
                <Text style={{ 
                  color: colors.ok, 
                  fontSize: responsive.SMALL_FONT_SIZE * 0.8,
                  fontWeight: '600',
                  marginLeft: 4
                }}>
                  (+{b.royaltiesBreakdown.top})
                </Text>
              )}
            </View>
          </View>
          
          {/* Middle Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ color: colors.text, fontSize: responsive.SMALL_FONT_SIZE }}>Middle</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ 
                color: a.lines.middle > 0 ? colors.ok : colors.text, 
                fontSize: responsive.SMALL_FONT_SIZE,
                fontWeight: a.lines.middle > 0 ? '700' : '400'
              }}>
                {a.lines.middle >= 0 ? '+' : ''}{a.lines.middle}
              </Text>
              {a.royaltiesBreakdown?.middle > 0 && (
                <Text style={{ 
                  color: colors.ok, 
                  fontSize: responsive.SMALL_FONT_SIZE * 0.8,
                  fontWeight: '600',
                  marginLeft: 4
                }}>
                  (+{a.royaltiesBreakdown.middle})
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ 
                color: b.lines.middle > 0 ? colors.ok : colors.text, 
                fontSize: responsive.SMALL_FONT_SIZE,
                fontWeight: b.lines.middle > 0 ? '700' : '400'
              }}>
                {b.lines.middle >= 0 ? '+' : ''}{b.lines.middle}
              </Text>
              {b.royaltiesBreakdown?.middle > 0 && (
                <Text style={{ 
                  color: colors.ok, 
                  fontSize: responsive.SMALL_FONT_SIZE * 0.8,
                  fontWeight: '600',
                  marginLeft: 4
                }}>
                  (+{b.royaltiesBreakdown.middle})
                </Text>
              )}
            </View>
          </View>
          
          {/* Bottom Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ color: colors.text, fontSize: responsive.SMALL_FONT_SIZE }}>Bottom</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ 
                color: a.lines.bottom > 0 ? colors.ok : colors.text, 
                fontSize: responsive.SMALL_FONT_SIZE,
                fontWeight: a.lines.bottom > 0 ? '700' : '400'
              }}>
                {a.lines.bottom >= 0 ? '+' : ''}{a.lines.bottom}
              </Text>
              {a.royaltiesBreakdown?.bottom > 0 && (
                <Text style={{ 
                  color: colors.ok, 
                  fontSize: responsive.SMALL_FONT_SIZE * 0.8,
                  fontWeight: '600',
                  marginLeft: 4
                }}>
                  (+{a.royaltiesBreakdown.bottom})
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ 
                color: b.lines.bottom > 0 ? colors.ok : colors.text, 
                fontSize: responsive.SMALL_FONT_SIZE,
                fontWeight: b.lines.bottom > 0 ? '700' : '400'
              }}>
                {b.lines.bottom >= 0 ? '+' : ''}{b.lines.bottom}
              </Text>
              {b.royaltiesBreakdown?.bottom > 0 && (
                <Text style={{ 
                  color: colors.ok, 
                  fontSize: responsive.SMALL_FONT_SIZE * 0.8,
                  fontWeight: '600',
                  marginLeft: 4
                }}>
                  (+{b.royaltiesBreakdown.bottom})
                </Text>
              )}
            </View>
          </View>
          
          {/* Scoop Bonus */}
          {(a.scoop > 0 || b.scoop > 0) && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ color: colors.text, fontSize: responsive.SMALL_FONT_SIZE }}>Scoop Bonus</Text>
              <Text style={{ 
                color: a.scoop > 0 ? colors.ok : colors.text, 
                fontSize: responsive.SMALL_FONT_SIZE,
                fontWeight: a.scoop > 0 ? '700' : '400'
              }}>
                {a.scoop > 0 ? '+' : ''}{a.scoop}
              </Text>
              <Text style={{ 
                color: b.scoop > 0 ? colors.ok : colors.text, 
                fontSize: responsive.SMALL_FONT_SIZE,
                fontWeight: b.scoop > 0 ? '700' : '400'
              }}>
                {b.scoop > 0 ? '+' : ''}{b.scoop}
              </Text>
            </View>
          )}
          
          {/* Total */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: colors.outline,
            marginTop: 8
          }}>
            <Text style={{ color: colors.text, fontSize: responsive.BASE_FONT_SIZE, fontWeight: '700' }}>Total</Text>
            <Text style={{ 
              color: aTotal > 0 ? colors.ok : aTotal < 0 ? '#ff6b6b' : colors.text, 
              fontSize: responsive.BASE_FONT_SIZE,
              fontWeight: '700'
            }}>
              {aTotal >= 0 ? '+' : ''}{aTotal}
            </Text>
            <Text style={{ 
              color: bTotal > 0 ? colors.ok : bTotal < 0 ? '#ff6b6b' : colors.text, 
              fontSize: responsive.BASE_FONT_SIZE,
              fontWeight: '700'
            }}>
              {bTotal >= 0 ? '+' : ''}{bTotal}
            </Text>
          </View>
        </View>
        
        {/* Difference */}
        <View style={{
          backgroundColor: colors.panel2,
          borderRadius: 8,
          padding: 12,
          alignItems: 'center',
          marginBottom: 16
        }}>
          <Text style={{
            color: colors.sub,
            fontSize: responsive.SMALL_FONT_SIZE,
            fontWeight: '600',
            marginBottom: 4
          }}>
            Difference
          </Text>
          <Text style={{
            color: difference >= 0 ? colors.ok : '#ff6b6b',
            fontSize: responsive.BASE_FONT_SIZE * 1.1,
            fontWeight: '800'
          }}>
            {difference >= 0 ? '+' : ''}{difference} points
          </Text>
        </View>
        
        {/* Chip Conversion for Ranked Matches */}
        <View style={{
          backgroundColor: colors.panel2,
          borderRadius: 8,
          padding: 12,
          alignItems: 'center',
          marginBottom: 16
        }}>
          <Text style={{
            color: colors.sub,
            fontSize: responsive.SMALL_FONT_SIZE,
            fontWeight: '600',
            marginBottom: 4
          }}>
            Chip Conversion (1 point = 10 chips)
          </Text>
          <Text style={{
            color: difference >= 0 ? colors.ok : '#ff6b6b',
            fontSize: responsive.BASE_FONT_SIZE * 1.1,
            fontWeight: '800'
          }}>
            {difference >= 0 ? '+' : ''}{difference * 10} chips
          </Text>
        </View>
        
        {/* Close Button */}
        <Pressable
          onPress={onClose}
          style={{
            backgroundColor: colors.accent,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 24,
            alignItems: 'center'
          }}
        >
          <Text style={{
            color: colors.text,
            fontSize: responsive.BASE_FONT_SIZE,
            fontWeight: '700'
          }}>
            Close
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// Helper function to calculate line scores
function getLineScore(d, line) {
  const lineScore = d.lines[line] || 0;
  const royaltyScore = d.royaltiesBreakdown?.[line] || 0;
  return lineScore + royaltyScore;
}

// Helper function to calculate total score
function getTotalScore(d) {
  const top = getLineScore(d, 'top');
  const middle = getLineScore(d, 'middle');
  const bottom = getLineScore(d, 'bottom');
  const scoopBonus = d.scoop || 0; // Include scoop bonus (+3)
  return top + middle + bottom + scoopBonus;
}

// Player Name and Avatar Component
function PlayerNameWithAvatar({ name, avatar, inFantasyland, responsive, isPlayer = false }) {
  // Responsive avatar size based on screen size
  const avatarSize = responsive.isSmallDevice ? 32 : responsive.isMediumDevice ? 36 : 40;
  
  return (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginBottom: 8,
      position: 'relative',
      minWidth: 200 // Fixed minimum width to ensure consistent positioning
    }}>
      {/* Avatar - Fixed position at center */}
      <View style={{
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarSize / 2,
        borderWidth: 2,
        borderColor: colors.outline,
        backgroundColor: colors.panel2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        overflow: 'hidden',
        alignSelf: 'center'
      }}>
        {avatar ? (
          <Image 
            source={{ uri: avatar }} 
            style={{ 
              width: avatarSize, 
              height: avatarSize,
              borderRadius: avatarSize / 2
            }} 
          />
        ) : (
          <Text style={{ 
            color: colors.text, 
            fontSize: avatarSize * 0.4, 
            fontWeight: '700' 
          }}>
            {(name || 'U').slice(0, 1).toUpperCase()}
          </Text>
        )}
      </View>
      
      {/* Username - Centered below avatar */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}>
        {/* Fantasyland indicator */}
        {inFantasyland && (
          <Text style={{ 
            fontSize: responsive.LARGE_FONT_SIZE, 
            marginRight: 4 
          }}>
            🌈
          </Text>
        )}
        
        <Text style={{ 
          color: colors.text, 
          fontWeight: '700', 
          fontSize: responsive.LARGE_FONT_SIZE,
          textAlign: 'center'
        }}>
          {name || 'Player'}
        </Text>
      </View>
    </View>
  );
}

// Simple Chip Counter Component - shows server values directly
function ChipCounter({ value, responsive }) {
  return (
    <Text style={{ 
      color: colors.sub, 
      fontSize: responsive.BASE_FONT_SIZE 
    }}>
      {value}
    </Text>
  );
}

export default function Play({ route }) {
  const navigation = useNavigation();
  const { roomId } = route.params || {};
  console.log("🎯 MOBILE: Play screen loaded with roomId:", roomId, "route.params:", route.params);
  
  // Avatar state
  const [playerAvatar, setPlayerAvatar] = useState(null);
  const [opponentAvatar, setOpponentAvatar] = useState(null);
  
  // Handle screen size changes and orientation changes
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    
    return () => subscription?.remove();
  }, []);
  
  // Recalculate responsive dimensions when screen size changes
  const currentResponsive = useMemo(() => {
    const { width: screenWidth } = dimensions;
    
    const isSmallDevice = screenWidth < 375;
    const isMediumDevice = screenWidth >= 375 && screenWidth < 414;
    const isLargeDevice = screenWidth >= 414;
    
    // Calculate card sizes based on screen size - opponent board smaller, player board larger
    const opponentCardWidthPercent = 0.10; // 10% of screen width for opponent board (smaller, just for viewing)
    const playerCardWidthPercent = 0.1425; // 14.25% of screen width for player board (larger, for interaction)
    
    const opponentBaseSlotW = Math.min(Math.max(screenWidth * opponentCardWidthPercent, 30), 60);
    const playerBaseSlotW = Math.min(Math.max(screenWidth * playerCardWidthPercent, 45), 90);
    
    const opponentBaseSlotH = Math.floor(opponentBaseSlotW * 1.4); // Proper playing card height
    const playerBaseSlotH = Math.floor(playerBaseSlotW * 1.4); // Proper playing card height
    
    const OPPONENT_SLOT_W = Math.floor(opponentBaseSlotW * 0.975); // 2.5% smaller
    const OPPONENT_SLOT_H = Math.floor(opponentBaseSlotH * 0.975); // 2.5% smaller
    const SLOT_W = Math.floor(playerBaseSlotW * 0.975); // 2.5% smaller
    const SLOT_H = Math.floor(playerBaseSlotH * 0.975); // 2.5% smaller
    
    // Responsive gaps based on screen size
    const gapPercent = 0.005; // 0.5% of screen width (reduced from 1%)
    const SLOT_GAP = Math.min(Math.max(screenWidth * gapPercent, 1), 2); // Min 1px, Max 2px (reduced from 3px)
    const ROW_GAP = Math.min(Math.max(screenWidth * 0.002, 1), 2); // 0.2% of screen width, Min 1px, Max 2px
    
    // Tighter gaps for hand cards (especially fantasyland with 7 cards)
    const handGapPercent = 0.0001; // 0.01% of screen width (tiny gap)
    const HAND_GAP = Math.min(Math.max(screenWidth * handGapPercent, 0), 1); // Min 0px, Max 1px
    
    // Responsive board and control heights
    const BOARD_HEIGHT = SLOT_H * 3 + ROW_GAP * 2;
    
    // Responsive control heights based on screen size
    const controlHeightPercent = 0.08; // 8% of screen height
    const CONTROLS_HEIGHT = Math.min(Math.max(screenHeight * controlHeightPercent, 60), 100); // Min 60px, Max 100px
    
    // Responsive hand height
    const handHeightPercent = 0.15; // 15% of screen height
    const HAND_HEIGHT = Math.min(Math.max(screenHeight * handHeightPercent, 80), 120); // Min 80px, Max 120px
    
    // Responsive padding and margins
    const paddingPercent = 0.04; // 4% of screen width
    const HORIZONTAL_PADDING = Math.min(Math.max(screenWidth * paddingPercent, 12), 24); // Min 12px, Max 24px
    
    // Responsive font sizes
    const fontSizePercent = 0.04; // 4% of screen width
    const BASE_FONT_SIZE = Math.min(Math.max(screenWidth * fontSizePercent, 12), 18); // Min 12px, Max 18px
    const LARGE_FONT_SIZE = Math.min(Math.max(screenWidth * fontSizePercent * 1.2, 14), 22); // Min 14px, Max 22px
    const SMALL_FONT_SIZE = Math.min(Math.max(screenWidth * fontSizePercent * 0.8, 10), 16); // Min 10px, Max 16px
    
    // Responsive spacing for different screen sections
    const sectionSpacingPercent = 0.06; // 6% of screen height
    const SECTION_SPACING = Math.min(Math.max(screenHeight * sectionSpacingPercent, 40), 80); // Min 40px, Max 80px
    
    // Responsive control button dimensions
    const controlButtonPercent = 0.13; // 13% of screen width
    const CONTROL_BUTTON_SIZE = Math.min(Math.max(screenWidth * controlButtonPercent, 55), 90); // Min 55px, Max 90px
    const CONTROL_BUTTON_RADIUS = CONTROL_BUTTON_SIZE / 2;
    
    // Responsive text sizes for controls
    const controlTextPercent = 0.035; // 3.5% of screen width
    const CONTROL_TEXT_SIZE = Math.min(Math.max(screenWidth * controlTextPercent, 12), 18); // Min 12px, Max 18px
    const CONTROL_ICON_SIZE = Math.min(Math.max(screenWidth * controlTextPercent * 1.5, 16), 28); // Min 16px, Max 28px
    
    // Responsive button padding
    const buttonPaddingPercent = 0.02; // 2% of screen width
    const BUTTON_PADDING_H = Math.min(Math.max(screenWidth * buttonPaddingPercent, 8), 16); // Min 8px, Max 16px
    const BUTTON_PADDING_V = Math.min(Math.max(screenHeight * buttonPaddingPercent * 0.5, 6), 12); // Min 6px, Max 12px
    
    return {
      SLOT_W,
      SLOT_H,
      OPPONENT_SLOT_W,
      OPPONENT_SLOT_H,
      SLOT_GAP,
      ROW_GAP,
      HAND_GAP,
      BOARD_HEIGHT,
      CONTROLS_HEIGHT,
      HAND_HEIGHT,
      HORIZONTAL_PADDING,
      BASE_FONT_SIZE,
      LARGE_FONT_SIZE,
      SMALL_FONT_SIZE,
      SECTION_SPACING,
      CONTROL_BUTTON_SIZE,
      CONTROL_BUTTON_RADIUS,
      CONTROL_TEXT_SIZE,
      CONTROL_ICON_SIZE,
      BUTTON_PADDING_H,
      BUTTON_PADDING_V,
      isSmallDevice,
      isMediumDevice,
      isLargeDevice,
      screenWidth,
      screenHeight
    };
  }, [dimensions]);
  

  
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
  const handNumber = useGame(state => state.round);
  const isRanked = useGame(state => state.isRanked);
  const timer = useGame(state => state.timer);
  const gameEnd = useGame(state => state.gameEnd);
  
  // Get functions that don't change
  const { applyEvent, setPlacement, unstage, commitTurnLocal, setGameEnd } = useGame();
  
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
  const [sortMode, setSortMode] = useState('rank'); // 'rank' or 'suit'
  
  // Animation state for score reveal sequence
  const [scoreAnimationStep, setScoreAnimationStep] = useState(0); // 0 = none, 1 = top, 2 = middle, 3 = bottom, 4 = total, 5 = chip count indicator
  const [showChipChange, setShowChipChange] = useState(false);
  
  // Game end popup state
  const [showGameEndPopup, setShowGameEndPopup] = useState(false);
  
  // Detailed scoring overlay state


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
        setShowGameEndPopup(false);
      }
      if (evt === 'round:reveal') {
        const meId = useGame.getState().userId;
        const pair = data?.pairwise?.find(p => p.aUserId === meId || p.bUserId === meId);
        if (pair) {
          const scoreDetail = { a: pair.aUserId === meId ? pair.a : pair.b, b: pair.aUserId === meId ? pair.b : pair.a };
          setScoreDetail(scoreDetail);
          setShowScore(true); // persist until next round
          // Reset animation step to start the sequence
          setScoreAnimationStep(0);
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
      if (evt === 'game:end') {
        // Handle game end - set the game end state but delay showing popup until scoring animation completes
        console.log('🎯 Game ended:', data);
        setGameEnd(data);
        playSfx('commit'); // Play a sound for game end
        
        // Delay showing the winner/loser popup until after scoring animation completes
        // The scoring animation takes 3 seconds, so wait 3.5 seconds total
        // Note: Reveal timer is now 10 seconds, so popup will show well before timer expires
        setTimeout(() => {
          setShowGameEndPopup(true);
        }, 3500);
      }
      applyEvent(evt, data);
    });
    
    return off;
  }, []); // Remove applyEvent from dependencies to prevent infinite re-renders

  // Animation sequence effect - triggers when scoring starts
  useEffect(() => {
    if (showScore && scoreDetail) {
      // Reset animation step
      setScoreAnimationStep(0);
      
      // Start animation sequence with delays and sound effects
      const timer1 = setTimeout(() => {
        setScoreAnimationStep(1); // Top line
        playSfx('pop1'); // Play pop1.wav for top row
      }, 500);
      
      const timer2 = setTimeout(() => {
        setScoreAnimationStep(2); // Middle line
        playSfx('pop2'); // Play pop2.wav for middle row
      }, 1000);
      
      const timer3 = setTimeout(() => {
        setScoreAnimationStep(3); // Bottom line
        playSfx('pop3'); // Play pop3.wav for bottom row
      }, 1500);
      
      const timer4 = setTimeout(() => {
        setScoreAnimationStep(4); // Total score
        playSfx('pop4'); // Play pop4.wav for total score
      }, 2000);
      
      const timer5 = setTimeout(() => {
        setScoreAnimationStep(5); // Chip count indicator
        setShowChipChange(true);
      }, 2500); // 500ms after total score
      
      const timer6 = setTimeout(() => {
        setScoreAnimationStep(5); // Chip count indicator (no animation)
      }, 3000); // 500ms after chip count indicator
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
        clearTimeout(timer6);
      };
    } else {
      // Reset animation when scoring ends
      setScoreAnimationStep(0);
      setShowChipChange(false);
    }
  }, [showScore, scoreDetail]);

  // Reset game end popup when gameEnd state changes
  useEffect(() => {
    if (!gameEnd) {
      setShowGameEndPopup(false);
    }
  }, [gameEnd]);

  // Function to manually trigger animation
  const triggerAnimation = () => {
    if (scoreDetail) {
      setShowScore(true);
      setScoreAnimationStep(0);
      setShowChipChange(false);
      
      // Start animation sequence with delays and sound effects
      const timer1 = setTimeout(() => {
        setScoreAnimationStep(1); // Top line
        playSfx('pop1'); // Play pop1.wav for top row
      }, 500);
      
      const timer2 = setTimeout(() => {
        setScoreAnimationStep(2); // Middle line
        playSfx('pop2'); // Play pop2.wav for middle row
      }, 1000);
      
      const timer3 = setTimeout(() => {
        setScoreAnimationStep(3); // Bottom line
        playSfx('pop3'); // Play pop3.wav for bottom row
      }, 1500);
      
      const timer4 = setTimeout(() => {
        setScoreAnimationStep(4); // Total score
        playSfx('pop4'); // Play pop4.wav for total score
      }, 2000);
      
      const timer5 = setTimeout(() => {
        setScoreAnimationStep(5); // Chip count indicator
        setShowChipChange(true);
      }, 2500); // 500ms after total score
      
      const timer6 = setTimeout(() => {
        setScoreAnimationStep(5); // Chip count indicator (no animation)
      }, 3000); // 500ms after chip count indicator
      
      // Clean up timers after animation completes
      setTimeout(() => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
        clearTimeout(timer6);
      }, 4500); // Extended to allow for chip animation and indicator
    }
  };

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

  // Sort cards by rank or suit
  const sortCards = (cards, mode) => {
    const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const suitOrder = ['c', 'd', 'h', 's']; // clubs, diamonds, hearts, spades
    
    return [...cards].sort((a, b) => {
      const aRank = a.slice(0, -1);
      const aSuit = a.slice(-1).toLowerCase();
      const bRank = b.slice(0, -1);
      const bSuit = b.slice(-1).toLowerCase();
      
      if (mode === 'rank') {
        // Sort by rank first, then by suit
        const rankDiff = rankOrder.indexOf(aRank) - rankOrder.indexOf(bRank);
        if (rankDiff !== 0) return rankDiff;
        return suitOrder.indexOf(aSuit) - suitOrder.indexOf(bSuit);
      } else {
        // Sort by suit first, then by rank
        const suitDiff = suitOrder.indexOf(aSuit) - suitOrder.indexOf(bSuit);
        if (suitDiff !== 0) return suitDiff;
        return rankOrder.indexOf(aRank) - rankOrder.indexOf(bRank);
      }
    });
  };

  // cards available
  const visibleHand = useMemo(() => {
    const taken = new Set([
      ...board.top, ...board.middle, ...board.bottom,
      ...staged.placements.map(p => p.card),
    ]);
    if (staged.discard) taken.add(staged.discard);
    const result = hand.filter(c => !taken.has(c));
    
    // Sort cards in Fantasy Land mode
    if (inFantasyland) {
      return sortCards(result, sortMode);
    }
    
    console.log('🎯 visibleHand calculated - inFantasyland:', inFantasyland, 'hand.length:', hand.length, 'result.length:', result.length);
    return result;
  }, [hand, board.top, board.middle, board.bottom, staged.placements, staged.discard, inFantasyland, sortMode]);

  // Load player avatar
  const loadPlayerAvatar = async () => {
    try {
      const token = await SecureStore.getItemAsync("ofc_jwt");
      if (!token) return;
      
      const r = await axios.get(`${SERVER_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
      setPlayerAvatar(r.data?.avatar || null);
    } catch (error) {
      console.error('Error loading player avatar:', error);
    }
  };

  // Load opponent avatar
  const loadOpponentAvatar = async (opponentId) => {
    if (!opponentId) return;
    
    // For now, just set to null to avoid API calls and errors
    // In the future, we could implement a more sophisticated approach
    // that checks if the opponent has an avatar before making the call
    setOpponentAvatar(null);
  };

  // Load avatars when component mounts
  useEffect(() => {
    loadPlayerAvatar();
  }, []);

  // Load opponent avatar when opponent changes
  useEffect(() => {
    if (opponent?.userId) {
      loadOpponentAvatar(opponent.userId);
    }
  }, [opponent?.userId]);

  // opponent
  const meId = useGame(state => state.userId);
  const me = useMemo(() => players.find(p => p.userId === meId) || { name: 'You', score: 0 }, [players, meId]);
  const others = useMemo(() => players.filter(p => p.userId !== meId), [players, meId]);
  const opponent = useMemo(() => {
    return others[0] || null;
  }, [others]);
  
  // Use server chip values directly - no local calculation
  const finalChipValues = useMemo(() => {
    return { 
      player: me.tableChips || 500, 
      opponent: others[0]?.tableChips || 500 
    };
  }, [me.tableChips, others[0]?.tableChips]);
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

  const onSort = () => {
    setSortMode(prev => prev === 'rank' ? 'suit' : 'rank');
  };

  const onCommit = () => {
    console.log("🎯 MOBILE: Ready button clicked!");
    if (!canCommit) {
      console.log("🎯 MOBILE: Cannot commit - canCommit is false");
      return;
    }
    const state = useGame.getState();
    const { currentDeal, hand, userId, inFantasyland } = state;
    console.log("🎯 MOBILE: onCommit - state.currentDeal:", currentDeal, "state.hand:", hand);
    const placedSet = new Set(staged.placements.map(p => p.card));
    
    let leftover = null;
    if (!inFantasyland) {
      // Normal mode: auto-discard leftover card
      // Use hand instead of currentDeal since that's where the cards actually are
      leftover = (hand || []).find(c => !placedSet.has(c)) || null;
      console.log("🎯 MOBILE: onCommit - hand:", hand, "placedSet:", Array.from(placedSet), "leftover:", leftover);
    } else {
      // Fantasyland mode: auto-discard leftover card (1 card should be discarded)
      leftover = (hand || []).find(c => !placedSet.has(c)) || null;
      console.log("🎯 MOBILE: onCommit - fantasyland hand:", hand, "placedSet:", Array.from(placedSet), "leftover:", leftover);
    }

    const gameState = useGame.getState();
    const gameRoomId = gameState.roomId;
    console.log("🎯 MOBILE: Using roomId from route:", roomId, "from game state:", gameRoomId);
    const finalRoomId = gameRoomId || roomId;
    const readyData = { roomId: finalRoomId, placements: staged.placements, discard: leftover || undefined, userId };
    console.log("🎯 MOBILE: Emitting action:ready with data:", readyData);
    console.log("🎯 MOBILE: onCommit - inFantasyland:", inFantasyland, "leftover:", leftover, "final discard value:", readyData.discard);
    console.log("🎯 MOBILE: roomId value:", roomId, "type:", typeof roomId);
    emit("action:ready", readyData);
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
      // Handle timer events through useGame store
      if (evt === "timer:start" || evt === "timer:expired") {
        applyEvent(evt, data);
      }
    });
    return () => off();
  }, []);

  // Debug: Monitor board state changes






  // Determine how many cards are needed based on the current round
  const needed = inFantasyland ? 13 : (currentRound === 1 ? 5 : 2);
  const stagedCount = staged.placements.length;
  const canPress = stagedCount === needed;
  
  // console.log('🎯 Render - inFantasyland:', inFantasyland, 'needed:', needed, 'stagedCount:', stagedCount, 'canPress:', canPress);





  // Game End Splash Screen - only show after scoring animation completes
  if (gameEnd && showGameEndPopup) {
    const isWinner = gameEnd.winner?.userId === meId;
    const isLoser = gameEnd.loser?.userId === meId;
    
    // Stop the timer when game ends
    if (timer.isActive) {
      setTimer(prev => ({ ...prev, isActive: false }));
    }
    
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: colors.bg, 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingHorizontal: 40
      }}>
        <View style={{
          backgroundColor: colors.panel2,
          borderRadius: 20,
          padding: 30,
          alignItems: 'center',
          borderWidth: 2,
          borderColor: isWinner ? '#4CAF50' : isLoser ? '#F44336' : colors.outline,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8
        }}>
          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: isWinner ? '#4CAF50' : isLoser ? '#F44336' : colors.text,
            marginBottom: 10,
            textAlign: 'center'
          }}>
            {isWinner ? '🎉 Congratulations!' : isLoser ? '😔 Unlucky!' : 'Game Over'}
          </Text>
          
          <Text style={{
            fontSize: 18,
            color: colors.text,
            marginBottom: 20,
            textAlign: 'center',
            lineHeight: 24
          }}>
            {isWinner 
              ? `You win! 1000 chips added to your chip balance.`
              : isLoser 
                ? `You lost... you've lost 500 chips from your chip balance.`
                : 'The game has ended'
            }
          </Text>
          
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <Image 
              source={require('../../assets/images/chips.png')} 
              style={{ 
                width: 24, 
                height: 24,
                marginRight: 8
              }} 
            />
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: colors.text
            }}>
              {gameEnd.finalChips.find(p => p.userId === meId)?.chips || 500}
            </Text>
          </View>
          
          <Pressable
            onPress={() => {
              // Leave the room and navigate back to lobby
              emit('room:leave', { roomId: roomId });
              // Navigate back to lobby screen
              navigation.navigate('Lobby');
            }}
            style={{
              backgroundColor: colors.accent,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 10,
              marginTop: 10
            }}
          >
            <Text style={{
              color: colors.text,
              fontSize: 16,
              fontWeight: '600'
            }}>
              Return to Home
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, position: 'relative' }} pointerEvents="box-none">
      <BackButton title="" />
      
      {/* Hand number at top center */}
      <View style={{ 
        position: 'absolute', 
        top: currentResponsive.isSmallDevice ? 40 : 50, 
        left: 0, 
        right: 0, 
        alignItems: 'center',
        zIndex: 1001
      }}>
        <Text style={{ 
          color: colors.sub, 
          fontSize: currentResponsive.SMALL_FONT_SIZE,
          fontWeight: '600'
        }}>
          Hand #{handNumber || 1}
        </Text>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginTop: 2
        }}>
          <Text style={{ 
            color: colors.sub, 
            fontSize: currentResponsive.SMALL_FONT_SIZE * 0.8,
            fontWeight: '400'
          }}>
            1 point = 10 
          </Text>
          <Image 
            source={require('../../assets/images/chips.png')} 
            style={{ 
              width: currentResponsive.SMALL_FONT_SIZE * 0.8 * 1.2, 
              height: currentResponsive.SMALL_FONT_SIZE * 0.8 * 1.2,
              marginLeft: 2
            }} 
          />
        </View>
      </View>
      
      {/* Test Reveal Button - Top Right */}
      <Pressable
        onPress={triggerAnimation}
        style={{
          position: 'absolute',
          top: currentResponsive.isSmallDevice ? 50 : 60,
          right: 20,
          backgroundColor: colors.accent,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          zIndex: 1002,
        }}
      >
        <Text style={{ 
          color: colors.text, 
          fontSize: 12, 
          fontWeight: '600',
          textAlign: 'center'
        }}>
          WARNING:{'\n'}Test Reveal
        </Text>
      </Pressable>
      



      {/* Opponent area - with name/avatar/chips at top left */}
      <View style={{ 
        height: currentResponsive.SECTION_SPACING * 3.5,
        paddingTop: currentResponsive.SECTION_SPACING * 1.5,
        paddingHorizontal: currentResponsive.HORIZONTAL_PADDING,
        position: 'relative'
      }}>
        {/* Opponent Name - positioned at top center */}
        {others[0] ? (
          <View style={{ 
            position: 'absolute', 
            top: currentResponsive.SECTION_SPACING * 2.3, 
            left: 0, 
            right: 0,
            zIndex: 10,
            alignItems: 'center'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {others[0]?.inFantasyland && (
                <Text style={{ 
                  fontSize: currentResponsive.LARGE_FONT_SIZE, 
                  marginRight: 4 
                }}>
                  🌈
                </Text>
              )}
                              <Text style={{ 
                  color: colors.text, 
                  fontWeight: '700', 
                  fontSize: currentResponsive.BASE_FONT_SIZE
                }}>
                  {others[0].name || 'Opponent'}
                </Text>
            </View>
          </View>
        ) : null}

        {/* Opponent Avatar and Chips - positioned at top left */}
        {others[0] ? (
          <View style={{ 
            position: 'absolute', 
            top: currentResponsive.SECTION_SPACING * 2.7, 
            left: currentResponsive.HORIZONTAL_PADDING, 
            zIndex: 10,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            {/* Opponent Avatar and Chips - stacked vertically */}
            <View style={{ alignItems: 'center' }}>
              {/* Opponent Avatar - increased size to match player */}
              <View style={{
                width: currentResponsive.isSmallDevice ? 40 : 44,
                height: currentResponsive.isSmallDevice ? 40 : 44,
                borderRadius: (currentResponsive.isSmallDevice ? 40 : 44) / 2,
                borderWidth: 2,
                borderColor: colors.outline,
                backgroundColor: colors.panel2,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
                overflow: 'hidden'
              }}>
                {opponentAvatar ? (
                  <Image 
                    source={{ uri: opponentAvatar }} 
                    style={{ 
                      width: currentResponsive.isSmallDevice ? 40 : 44, 
                      height: currentResponsive.isSmallDevice ? 40 : 44,
                      borderRadius: (currentResponsive.isSmallDevice ? 40 : 44) / 2
                    }} 
                  />
                ) : (
                  <Text style={{ 
                    color: colors.text, 
                    fontSize: (currentResponsive.isSmallDevice ? 40 : 44) * 0.4, 
                    fontWeight: '700' 
                  }}>
                    {(others[0].name || 'U').slice(0, 1).toUpperCase()}
                  </Text>
                )}
              </View>
              
              {/* Opponent Chip Stack - positioned under avatar */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center'
              }}>
                <Image 
                  source={require('../../assets/images/chips.png')} 
                  style={{ 
                    width: currentResponsive.BASE_FONT_SIZE * 1.2, 
                    height: currentResponsive.BASE_FONT_SIZE * 1.2,
                    marginRight: 4
                  }} 
                />
                <ChipCounter
                  value={finalChipValues.opponent}
                  responsive={currentResponsive}
                />
              </View>
            </View>
          </View>
        ) : null}
        
        <View style={{ marginTop: currentResponsive.SECTION_SPACING * 1.3 }}>
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
            responsive={currentResponsive}
            showScore={showScore}
            scoreDetail={scoreDetail}
            animationStep={scoreAnimationStep}
          />
        </View>
      </View>

      {/* Player board and hand area - with name/avatar/chips at top left */}
      <View style={{ 
        flex: 1, 
        justifyContent: "flex-start", 
        paddingTop: currentResponsive.SECTION_SPACING * 2.5,
        position: 'relative'
      }}>
        {/* Player Name - positioned at top center */}
        <View style={{ 
          position: 'absolute', 
          top: currentResponsive.SECTION_SPACING * 3.0, 
          left: 0, 
          right: 0,
          zIndex: 10,
          alignItems: 'center'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {inFantasyland && (
              <Text style={{ 
                fontSize: currentResponsive.LARGE_FONT_SIZE, 
                marginRight: 4 
              }}>
                🌈
              </Text>
            )}
                          <Text style={{ 
                color: colors.text, 
                fontWeight: '700', 
                fontSize: currentResponsive.BASE_FONT_SIZE
              }}>
                {me.name || 'You'}
              </Text>
          </View>
        </View>

        {/* Player Avatar and Chips - positioned at top left */}
        <View style={{ 
          position: 'absolute', 
          top: currentResponsive.SECTION_SPACING * 3.7, 
          left: currentResponsive.HORIZONTAL_PADDING, 
          zIndex: 10,
          alignItems: 'center'
        }}>
          {/* Player Avatar and Chips - stacked vertically */}
          <View style={{ alignItems: 'center' }}>
            {/* Player Avatar - increased size */}
            <View style={{
              width: currentResponsive.isSmallDevice ? 40 : 44,
              height: currentResponsive.isSmallDevice ? 40 : 44,
              borderRadius: (currentResponsive.isSmallDevice ? 40 : 44) / 2,
              borderWidth: 2,
              borderColor: colors.outline,
              backgroundColor: colors.panel2,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
              overflow: 'hidden'
            }}>
              {playerAvatar ? (
                <Image 
                  source={{ uri: playerAvatar }} 
                  style={{ 
                    width: currentResponsive.isSmallDevice ? 40 : 44, 
                    height: currentResponsive.isSmallDevice ? 40 : 44,
                    borderRadius: (currentResponsive.isSmallDevice ? 40 : 44) / 2
                  }} 
                />
              ) : (
                <Text style={{ 
                  color: colors.text, 
                  fontSize: (currentResponsive.isSmallDevice ? 40 : 44) * 0.4, 
                  fontWeight: '700' 
                }}>
                  {(me.name || 'U').slice(0, 1).toUpperCase()}
                </Text>
              )}
            </View>
            
            {/* Player Chip Stack - positioned under avatar */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center'
            }}>
              <Image 
                source={require('../../assets/images/chips.png')} 
                style={{ 
                  width: currentResponsive.BASE_FONT_SIZE * 1.2, 
                  height: currentResponsive.BASE_FONT_SIZE * 1.2,
                  marginRight: 4
                }} 
              />
              <ChipCounter
                value={finalChipValues.player}
                responsive={currentResponsive}
              />
            </View>
          </View>
        </View>
        <View style={{ 
          alignSelf: "center", 
          height: currentResponsive.BOARD_HEIGHT, 
          paddingHorizontal: currentResponsive.HORIZONTAL_PADDING * 0.5, 
          justifyContent: "center",
          position: 'relative',
          marginTop: currentResponsive.SECTION_SPACING * 1.3
        }}>
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
            responsive={currentResponsive}
            showScore={showScore}
            scoreDetail={scoreDetail}
            isPlayer={true}
            rowType="top"
            animationStep={scoreAnimationStep}
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
            responsive={currentResponsive}
            showScore={showScore}
            scoreDetail={scoreDetail}
            isPlayer={true}
            rowType="middle"
            animationStep={scoreAnimationStep}
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
            responsive={currentResponsive}
            showScore={showScore}
            scoreDetail={scoreDetail}
            isPlayer={true}
            rowType="bottom"
            animationStep={scoreAnimationStep}
          />
        </View>
        


        <View style={{ 
          paddingHorizontal: currentResponsive.HORIZONTAL_PADDING * 0.5, 
          marginTop: currentResponsive.SECTION_SPACING * 0.6, 
          height: currentResponsive.HAND_HEIGHT, 
          justifyContent: "flex-start",
          position: 'relative'
        }}>
          {inFantasyland ? (
            // Always 2 rows of 7 cards for fantasyland with minimal spacing
            <View style={{ flex: 1, justifyContent: "center" }}>
                             <View style={{ 
                 flexDirection: "row", 
                 justifyContent: "center", 
                 marginBottom: currentResponsive.ROW_GAP
               }}>
                {visibleHand.slice(0, 7).map((card, index) => (
                  <View key={card + ":" + index} style={{ 
                    marginRight: currentResponsive.HAND_GAP
                  }} pointerEvents="box-none">
                    <DraggableCard card={card} small onDrop={onDrop} responsive={currentResponsive} />
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", justifyContent: "center" }}>
                {visibleHand.slice(7, 14).map((card, index) => (
                  <View key={card + ":" + (index + 7)} style={{ 
                    marginRight: currentResponsive.HAND_GAP
                  }} pointerEvents="box-none">
                    <DraggableCard card={card} small onDrop={onDrop} responsive={currentResponsive} />
                  </View>
                ))}
              </View>
            </View>
          ) : (
            // Single row for normal hands - no scrolling
                           <View style={{ 
                 flexDirection: "row", 
                 justifyContent: "center", 
                 flexWrap: "wrap",
                 paddingVertical: 0,
                 alignItems: "center",
                 height: "100%"
               }}>
              {visibleHand.map((card, index) => (
                <View key={card + ":" + index} style={{ 
                  marginRight: currentResponsive.HAND_GAP 
                }} pointerEvents="box-none">
                  <DraggableCard card={card} small onDrop={onDrop} responsive={currentResponsive} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Spacer to keep room for pinned controls */}
        <View style={{ height: currentResponsive.CONTROLS_HEIGHT, position: 'relative' }} />
      </View>

      {/* Controls pinned to bottom (never moves) */}
                             <View style={{ position: "absolute", left: 0, right: 0, bottom: currentResponsive.SECTION_SPACING * 0.4, paddingHorizontal: currentResponsive.HORIZONTAL_PADDING, paddingBottom: currentResponsive.SECTION_SPACING * 0.3, paddingTop: currentResponsive.SECTION_SPACING * 0.3, zIndex: 1000 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {/* Left: Sort button in Fantasy Land, Discard button in normal mode */}
          {inFantasyland && !reveal ? (
            <Pressable
              onPress={onSort}
              style={{
                width: currentResponsive.CONTROL_BUTTON_SIZE,
                height: currentResponsive.CONTROL_BUTTON_SIZE,
                borderRadius: currentResponsive.CONTROL_BUTTON_RADIUS,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.panel2,
                borderWidth: 1,
                borderColor: colors.outline,
              }}
            >
              <Text style={{ color: colors.text, fontSize: currentResponsive.CONTROL_TEXT_SIZE, fontWeight: '600' }}>
                SORT
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPressIn={() => setShowDiscards(true)}
              onPressOut={() => setShowDiscards(false)}
              style={{
                width: currentResponsive.CONTROL_BUTTON_SIZE,
                height: currentResponsive.CONTROL_BUTTON_SIZE,
                borderRadius: currentResponsive.CONTROL_BUTTON_RADIUS,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.panel2,
                borderWidth: 1,
                borderColor: colors.outline,
              }}
            >
              <Text style={{ color: colors.text, fontSize: currentResponsive.CONTROL_ICON_SIZE }}>🗑️</Text>
            </Pressable>
          )}

          {/* Center: Empty space (reveal timer uses bottom bar) */}
          <View style={{ width: currentResponsive.CONTROL_BUTTON_SIZE * 2.5 }} />

          {/* Right: Ready/Set button */}
          <Pressable
            onPress={onCommit}
            disabled={!canPress}
            style={{
              width: currentResponsive.CONTROL_BUTTON_SIZE,
              height: currentResponsive.CONTROL_BUTTON_SIZE,
              borderRadius: currentResponsive.CONTROL_BUTTON_RADIUS,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: canPress ? "#2e7d32" : colors.outline,
              borderWidth: canPress ? 0 : 1,
              borderColor: colors.outline,
            }}
          >
            <Text style={{ color: canPress ? "#fff" : colors.sub, fontSize: currentResponsive.CONTROL_ICON_SIZE }}>✓</Text>
          </Pressable>
        </View>

        {showDiscards && (
          <View style={{ 
            position: "absolute", 
            left: currentResponsive.CONTROL_BUTTON_SIZE * 1.5, 
            bottom: 0, 
            flexDirection: "row",
            flexWrap: "wrap",
            alignSelf: "center"
          }}>
            {discards.map((c, i) => (
              <View key={c+":"+i} style={{ marginRight: currentResponsive.SLOT_GAP, marginBottom: currentResponsive.SLOT_GAP }}>
                <Card card={c} micro noMargin responsive={currentResponsive} />
              </View>
            ))}
          </View>
        )}
      </View>






      



      {/* Scoop badges - positioned on bottom lines */}
      {showScore && scoreDetail?.a?.scoop > 0 && (
        <View style={{
          position: 'absolute',
          left: '50%',
          top: '60%',
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
          top: '25%',
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

      {/* Foul badges - positioned on bottom lines */}
      {showScore && scoreDetail?.a?.foul && (
        <View style={{
          position: 'absolute',
          left: '50%',
          top: '60%',
          transform: [{ translateX: '-50%' }],
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          <View style={{ 
            paddingVertical: 6, 
            paddingHorizontal: 12, 
            borderRadius: 8, 
            borderWidth: 1, 
            borderColor: '#ff6b6b', 
            backgroundColor: '#ff6b6b20' 
          }}>
            <Text style={{ color: '#ff6b6b', fontWeight: '700', fontSize: 14 }}>FOULED</Text>
          </View>
        </View>
      )}

      {showScore && scoreDetail?.b?.foul && (
        <View style={{
          position: 'absolute',
          left: '50%',
          top: '25%',
          transform: [{ translateX: '-50%' }],
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          <View style={{ 
            paddingVertical: 4, 
            paddingHorizontal: 8, 
            borderRadius: 6, 
            borderWidth: 1, 
            borderColor: '#ff6b6b', 
            backgroundColor: '#ff6b6b20' 
          }}>
            <Text style={{ color: '#ff6b6b', fontWeight: '700', fontSize: 12 }}>FOULED</Text>
          </View>
        </View>
      )}
      
      {/* Score Bubbles with Animation */}
      <ScoreBubbles 
        show={showScore} 
        playerAnchors={playerAnchors} 
        oppAnchors={oppAnchors} 
        detail={scoreDetail}
        animationStep={scoreAnimationStep}
      />
      

      
      {/* Timer Bar */}
      <TimerBar timer={timer} responsive={currentResponsive} />
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
  responsive,
  showScore = false,
  scoreDetail = null,
  isPlayer = true,
  rowType = 'top',
  animationStep = 0,
}) {
  const committedCount = committed.length;
  const stagedCount = staged.length;
  const remaining = Math.max(0, capacity - committedCount - stagedCount);
  const gap = compact ? (responsive.isSmallDevice ? 0.5 : 1) : responsive.SLOT_GAP;




  // Calculate position for score overlay - positioned at top-right of rightmost card
  const actualCards = committedCount + stagedCount;
  // Position the score box at the right edge of the row (after the last card)
  const scoreBoxPosition = (capacity * responsive.SLOT_W) + ((capacity - 1) * gap);

  return (
    <View style={{ marginBottom: responsive.ROW_GAP }} pointerEvents="box-none">
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
          borderWidth: highlightRow ? 1 : 0,
          borderColor: highlightRow ? colors.accent : "transparent",
          position: 'relative'
        }}
      >
        {/* top-right anchor inside player row */}
        {anchorRef ? <View ref={anchorRef} pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: 1, height: 1 }} /> : null}
        {committed.map((c, i) => {
          const foulStyle = isFouled ? getFoulTransform(rowOffset + i) : {};
          return (
            <View key={"c_"+i} style={[{ marginRight: gap }, foulStyle]} pointerEvents="none">
              <Card card={c} small noMargin responsive={responsive} />
            </View>
          );
        })}
        {staged.map((c, i) => (
          <View key={"s_"+i} style={{ marginRight: gap }} pointerEvents="box-none">
                            <DraggableCard card={c} small onDrop={onDrop} responsive={responsive} showPlaceholder={true} />
          </View>
        ))}
        {Array.from({ length: remaining }).map((_, i) => (
          <Animated.View
            key={"p_"+i}
            style={{
              width: responsive.SLOT_W, // Use responsive player card width
              height: responsive.SLOT_H, // Use responsive player card height
              marginRight: gap,
              borderWidth: responsive.isSmallDevice ? 1 : 1.5,
              borderColor: highlightRow ? colors.accent : colors.outline,
              borderRadius: responsive.isSmallDevice ? 8 : 10,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
            pointerEvents="none"
          />
        ))}
      </View>
      

      
      {/* Total Score Overlay (only on bottom row) */}
      {rowType === 'bottom' && showScore && scoreDetail && animationStep >= 4 && (
        <View style={{
          position: 'absolute',
          bottom: -8,
          right: 0,
          backgroundColor: colors.panel2,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: colors.outline,
          zIndex: 1000,
        }}>
          <Text style={{ 
            color: colors.text, 
            fontSize: 14, 
            fontWeight: '700' 
          }}>
            Total: {getTotalScore(isPlayer ? scoreDetail.a : scoreDetail.b)}
          </Text>
        </View>
      )}
    </View>
  );
}
