import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Image } from "react-native";

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

// Responsive design system
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calculate responsive dimensions based on screen size
const getResponsiveDimensions = () => {
  const isSmallDevice = screenWidth < 375; // iPhone SE, small Android
  const isMediumDevice = screenWidth >= 375 && screenWidth < 414; // iPhone 12, 13, 14
  const isLargeDevice = screenWidth >= 414; // iPhone 12/13/14 Pro Max, large Android
  
  // Calculate card sizes based on screen size - opponent board smaller, player board larger
  const opponentCardWidthPercent = 0.09; // 9% of screen width for opponent board (smaller, just for viewing)
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
  const gapPercent = 0.01; // 1% of screen width
  const SLOT_GAP = Math.min(Math.max(screenWidth * gapPercent, 1), 3); // Min 1px, Max 3px
  const ROW_GAP = Math.min(Math.max(screenWidth * gapPercent, 1), 3); // Min 1px, Max 3px
  
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

function NameWithScore({ name, score, delta, tableChips, isRanked, scoreDetail, isPlayer }) {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
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
          {chipDeltaText ? <Text style={{ color: chipDeltaColor }}> {chipDeltaText}</Text> : null}
        </Text>
      </View>
    );
  } else {
    // For regular matches, show score as before
    const deltaText = typeof delta === 'number' ? (delta >= 0 ? `+${delta}` : `${delta}`) : null;
    const deltaColor = deltaText && deltaText.startsWith('+') ? colors.ok || '#2e7d32' : '#C62828';
    const pointDeltaText = pointDelta !== null ? (pointDelta >= 0 ? `+${pointDelta}` : `${pointDelta}`) : null;
    const pointDeltaColor = pointDeltaText && pointDeltaText.startsWith('+') ? colors.ok || '#2e7d32' : '#C62828';
    
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: responsive.LARGE_FONT_SIZE, marginRight: 8 }}>{name}</Text>
        <Text style={{ color: colors.sub, fontSize: responsive.BASE_FONT_SIZE }}>
          {score ?? 0} {deltaText ? <Text style={{ color: deltaColor }}> {deltaText}</Text> : null}
        </Text>
      </View>
    );
  }
}

function OpponentBoard({ board, hidden, topRef, midRef, botRef, onTopLayout, onMidLayout, onBotLayout, topAnchorRef, midAnchorRef, botAnchorRef, isFouled, inFantasyland, responsive, showScore = false, scoreDetail = null }) {
  const tiny = true;
  const rainbowColor = useRainbowGlow();
  
  // Responsive opponent card dimensions (using opponent-specific sizing)
  const oppCardWidth = responsive.OPPONENT_SLOT_W;
  const oppCardHeight = responsive.OPPONENT_SLOT_H;
  
  return (
    <View style={{ paddingVertical: 4 }}>
      {/* Top Row */}
      <View ref={topRef} onLayout={onTopLayout} style={{ 
        flexDirection: "row", 
        alignSelf: "center", 
        marginBottom: responsive.ROW_GAP, 
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
        <View ref={topAnchorRef} pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: 1, height: 1 }} />
        {Array.from({ length: 3 }).map((_, i) => {
          const foulStyle = isFouled ? getFoulTransform(i) : {};
          return (
            <View key={"opp_top_"+i} style={[{ marginRight: responsive.isSmallDevice ? 2 : 3 }, foulStyle]}>
              {hidden ? (
                <Animated.View style={{ 
                  width: oppCardWidth, 
                  height: oppCardHeight, 
                  borderRadius: 6, 
                  borderWidth: 1.5, 
                  borderColor: inFantasyland ? rainbowColor : colors.outline, 
                  backgroundColor: colors.panel2 
                }} />
              ) : (
                board.top[i] ? <Card card={board.top[i]} tiny noMargin responsive={responsive} /> : <View style={{ width: oppCardWidth, height: oppCardHeight }} />
              )}
            </View>
          );
        })}
        
        {/* Line Score Overlay for Top */}
        {showScore && scoreDetail && (
          <View style={{
            position: 'absolute',
            top: -8,
            right: -8,
            backgroundColor: colors.panel2,
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: colors.outline,
            zIndex: 1000,
          }}>
            <Text style={{ 
              color: getLineScore(scoreDetail.b, 'top') >= 0 ? colors.ok || '#2e7d32' : '#C62828', 
              fontSize: 12, 
              fontWeight: '700' 
            }}>
              {getLineScore(scoreDetail.b, 'top') >= 0 ? `+${getLineScore(scoreDetail.b, 'top')}` : getLineScore(scoreDetail.b, 'top')}
            </Text>
          </View>
        )}
      </View>

      {/* Middle Row */}
      <View ref={midRef} onLayout={onMidLayout} style={{ 
        flexDirection: "row", 
        alignSelf: "center", 
        marginBottom: responsive.ROW_GAP, 
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
        <View ref={midAnchorRef} pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: 1, height: 1 }} />
        {Array.from({ length: 5 }).map((_, i) => {
          const foulStyle = isFouled ? getFoulTransform(3 + i) : {};
          return (
            <View key={"opp_mid_"+i} style={[{ marginRight: responsive.isSmallDevice ? 2 : 3 }, foulStyle]}>
              {hidden ? (
                <Animated.View style={{ 
                  width: oppCardWidth, 
                  height: oppCardHeight, 
                  borderRadius: 6, 
                  borderWidth: 1.5, 
                  borderColor: inFantasyland ? rainbowColor : colors.outline, 
                  backgroundColor: colors.panel2 
                }} />
              ) : (
                board.middle[i] ? <Card card={board.middle[i]} tiny noMargin responsive={responsive} /> : <View style={{ width: oppCardWidth, height: oppCardHeight }} />
              )}
            </View>
          );
        })}
        
        {/* Line Score Overlay for Middle */}
        {showScore && scoreDetail && (
          <View style={{
            position: 'absolute',
            top: -8,
            right: -8,
            backgroundColor: colors.panel2,
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: colors.outline,
            zIndex: 1000,
          }}>
            <Text style={{ 
              color: getLineScore(scoreDetail.b, 'middle') >= 0 ? colors.ok || '#2e7d32' : '#C62828', 
              fontSize: 12, 
              fontWeight: '700' 
            }}>
              {getLineScore(scoreDetail.b, 'middle') >= 0 ? `+${getLineScore(scoreDetail.b, 'middle')}` : getLineScore(scoreDetail.b, 'middle')}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Row */}
      <View ref={botRef} onLayout={onBotLayout} style={{ 
        flexDirection: "row", 
        alignSelf: "center", 
        marginBottom: responsive.ROW_GAP, 
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
        <View ref={botAnchorRef} pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: 1, height: 1 }} />
        {Array.from({ length: 5 }).map((_, i) => {
          const foulStyle = isFouled ? getFoulTransform(8 + i) : {};
          return (
            <View key={"opp_bot_"+i} style={[{ marginRight: responsive.isSmallDevice ? 2 : 3 }, foulStyle]}>
              {hidden ? (
                <Animated.View style={{ 
                  width: oppCardWidth, 
                  height: oppCardHeight, 
                  borderRadius: 6, 
                  borderWidth: 1.5, 
                  borderColor: inFantasyland ? rainbowColor : colors.outline, 
                  backgroundColor: colors.panel2 
                }} />
              ) : (
                board.bottom[i] ? <Card card={board.bottom[i]} tiny noMargin responsive={responsive} /> : <View style={{ width: oppCardWidth, height: oppCardHeight }} />
              )}
            </View>
          );
        })}
        
        {/* Line Score Overlay for Bottom */}
        {showScore && scoreDetail && (
          <View style={{
            position: 'absolute',
            top: -8,
            right: -8,
            backgroundColor: colors.panel2,
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: colors.outline,
            zIndex: 1000,
          }}>
            <Text style={{ 
              color: getLineScore(scoreDetail.b, 'bottom') >= 0 ? colors.ok || '#2e7d32' : '#C62828', 
              fontSize: 12, 
              fontWeight: '700' 
            }}>
              {getLineScore(scoreDetail.b, 'bottom') >= 0 ? `+${getLineScore(scoreDetail.b, 'bottom')}` : getLineScore(scoreDetail.b, 'bottom')}
            </Text>
          </View>
        )}
        
        {/* Total Score Overlay for Bottom */}
        {showScore && scoreDetail && (
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
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 999 }}>
      {bubbleAtPoint(playerAnchors.top, av.top, 'pt')}
      {bubbleAtPoint(playerAnchors.middle, av.middle, 'pm')}
      {bubbleAtPoint(playerAnchors.bottom, av.bottom, 'pb')}
      {bubbleAtPoint(oppAnchors.top, bv.top, 'ot')}
      {bubbleAtPoint(oppAnchors.middle, bv.middle, 'om')}
      {bubbleAtPoint(oppAnchors.bottom, bv.bottom, 'ob')}
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

export default function Play({ route }) {
  const { roomId } = route.params || {};
  
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
    const opponentCardWidthPercent = 0.09; // 9% of screen width for opponent board (smaller, just for viewing)
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
    const gapPercent = 0.01; // 1% of screen width
    const SLOT_GAP = Math.min(Math.max(screenWidth * gapPercent, 1), 3); // Min 1px, Max 3px
    const ROW_GAP = Math.min(Math.max(screenWidth * gapPercent, 1), 3); // Min 1px, Max 3px
    
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
  const [sortMode, setSortMode] = useState('rank'); // 'rank' or 'suit'

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

  const onSort = () => {
    setSortMode(prev => prev === 'rank' ? 'suit' : 'rank');
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
    <View style={{ flex: 1, backgroundColor: colors.bg, position: 'relative' }} pointerEvents="box-none">
      <BackButton title="" />
      
      {/* Hand number at top center */}
      <View style={{ 
        position: 'absolute', 
        top: currentResponsive.isSmallDevice ? 50 : 60, 
        left: 0, 
        right: 0, 
        alignItems: 'center',
        zIndex: 1001
      }}>
        <Text style={{ 
          color: colors.sub, 
          fontSize: currentResponsive.BASE_FONT_SIZE,
          fontWeight: '600'
        }}>
          Hand #{handNumber || 1}
        </Text>
        <Text style={{ 
          color: colors.sub, 
          fontSize: currentResponsive.SMALL_FONT_SIZE,
          fontWeight: '400',
          marginTop: 2
        }}>
          1 point = 10 chips
        </Text>
      </View>
      {/* Opponent area - responsive height */}
      <View style={{ 
        height: currentResponsive.SECTION_SPACING * 3.5, // Increased height to accommodate name and board
        paddingTop: currentResponsive.SECTION_SPACING * 2.2, // Increased padding to move opponent name down more
        paddingHorizontal: currentResponsive.HORIZONTAL_PADDING,
        position: 'relative'
      }}>
        {others[0] ? (
          <View style={{ alignItems: "center" }}>
            <NameWithScore 
              name={others[0].name} 
              score={others[0].score} 
              tableChips={others[0].tableChips}
              isRanked={isRanked}
              delta={reveal?.results?.[others[0].userId]}
              scoreDetail={scoreDetail}
              isPlayer={false}
            />
          </View>
        ) : null}
        <View style={{ marginTop: currentResponsive.SECTION_SPACING * 0.15 }}>
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
          />
        </View>
      </View>

      {/* Player board and hand area - responsive layout */}
      <View style={{ 
        flex: 1, 
        justifyContent: "flex-start", 
        paddingTop: currentResponsive.SECTION_SPACING * 3.2, // Increased padding to move player area down more
        position: 'relative'
      }}>
                  <View style={{ alignSelf: "center", marginBottom: currentResponsive.SECTION_SPACING * 0.15 }}>
            <NameWithScore 
              name={me.name || 'You'} 
              score={me.score} 
              tableChips={me.tableChips}
              isRanked={isRanked}
              delta={reveal?.results?.[me.userId]}
              scoreDetail={scoreDetail}
              isPlayer={true}
            />
          </View>
        <View style={{ 
          alignSelf: "center", 
          height: currentResponsive.BOARD_HEIGHT, 
          paddingHorizontal: currentResponsive.HORIZONTAL_PADDING * 0.5, 
          justifyContent: "center",
          position: 'relative'
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

          {/* Center: NEXT ROUND button (only when reveal is active) */}
          {reveal ? (
            <Pressable
              onPress={() => {
                emit("round:start", { roomId });
              }}
              disabled={nextRoundReady.has(meId)}
              style={{
                paddingVertical: currentResponsive.BUTTON_PADDING_V,
                paddingHorizontal: currentResponsive.BUTTON_PADDING_H,
                borderRadius: currentResponsive.CONTROL_BUTTON_RADIUS,
                backgroundColor: nextRoundReady.has(meId) ? colors.outline : "#2e7d32",
                borderWidth: nextRoundReady.has(meId) ? 1 : 0,
                borderColor: colors.outline,
                minWidth: currentResponsive.CONTROL_BUTTON_SIZE * 2.5,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ 
                color: nextRoundReady.has(meId) ? colors.sub : "#fff", 
                fontSize: currentResponsive.CONTROL_TEXT_SIZE, 
                fontWeight: "600" 
              }}>
                {nextRoundReady.has(meId) ? "WAITING..." : "NEXT ROUND"}
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: currentResponsive.CONTROL_BUTTON_SIZE * 2.5 }} />
          )}

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
}) {
  const committedCount = committed.length;
  const stagedCount = staged.length;
  const remaining = Math.max(0, capacity - committedCount - stagedCount);
  const gap = compact ? (responsive.isSmallDevice ? 1 : 2) : responsive.SLOT_GAP;
  const rainbowColor = useRainbowGlow();

  // Calculate line score for this row
  let lineScore = null;
  if (showScore && scoreDetail) {
    const playerData = isPlayer ? scoreDetail.a : scoreDetail.b;
    lineScore = getLineScore(playerData, rowType);
  }

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
              borderWidth: responsive.isSmallDevice ? 1.5 : 2,
              borderColor: inFantasyland ? rainbowColor : (highlightRow ? colors.accent : colors.outline),
              borderRadius: responsive.isSmallDevice ? 8 : 10,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
            pointerEvents="none"
          />
        ))}
      </View>
      
      {/* Line Score Overlay */}
      {lineScore !== null && (
        <View style={{
          position: 'absolute',
          top: -8,
          right: rowType === 'top' ? (5 - capacity) * (responsive.SLOT_W + gap) - responsive.SLOT_W : 0,
          backgroundColor: colors.panel2,
          borderRadius: 8,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderWidth: 1,
          borderColor: colors.outline,
          zIndex: 1000,
        }}>
          <Text style={{ 
            color: lineScore >= 0 ? colors.ok || '#2e7d32' : '#C62828', 
            fontSize: 12, 
            fontWeight: '700' 
          }}>
            {lineScore >= 0 ? `+${lineScore}` : lineScore}
          </Text>
        </View>
      )}
      
      {/* Total Score Overlay (only on bottom row) */}
      {rowType === 'bottom' && showScore && scoreDetail && (
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
