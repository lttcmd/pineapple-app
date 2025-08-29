import React, { useState } from "react";
import { View } from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, { runOnJS } from "react-native-reanimated";
import Card from "./Card";
import { useDrag } from "../drag/DragContext";
import { colors } from "../theme/colors";

/**
 * DraggableCard (Gesture API)
 * - Lifts the real card into the global overlay via DragContext (no duplicates).
 * - Calls onMove({x,y}) during drag for hover highlighting.
 * - Calls onDrop({ card, pageX, pageY }) on release for snapping.
 */
export default function DraggableCard({ card, small = false, onMove, onDrop, responsive = null, showPlaceholder = false }) {
  const { begin, move, end } = useDrag();
  const [dragging, setDragging] = useState(false);

  // Use responsive dimensions if provided, otherwise fall back to fixed sizes
  const PLACEHOLDER_W = responsive ? responsive.SLOT_W : (small ? 62 : 64);
  const PLACEHOLDER_H = responsive ? responsive.SLOT_H : (small ? 92 : 88);

  const pan = Gesture.Pan()
    .hitSlop({ horizontal: 8, vertical: 8 }) // easier to grab
    .onBegin((evt) => {
      runOnJS(setDragging)(true);
      runOnJS(begin)({
        card,
        small,
        x: evt.absoluteX,
        y: evt.absoluteY,
        offsetX: evt.x,
        offsetY: evt.y,
      });
      if (onMove) runOnJS(onMove)({ x: evt.absoluteX, y: evt.absoluteY });
    })
    .onUpdate((evt) => {
      runOnJS(move)(evt.absoluteX, evt.absoluteY);
      if (onMove) runOnJS(onMove)({ x: evt.absoluteX, y: evt.absoluteY });
    })
    .onEnd((evt) => {
      runOnJS(end)();
      runOnJS(setDragging)(false);
      if (onDrop) runOnJS(onDrop)({ card, pageX: evt.absoluteX, pageY: evt.absoluteY });
    })
    .onFinalize(() => {
      // covers cancel/interrupt
      runOnJS(end)();
      runOnJS(setDragging)(false);
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View>
        {/* Show placeholder when dragging from board, transparent placeholder when dragging from hand */}
        {dragging && showPlaceholder ? (
          <View style={{
            width: PLACEHOLDER_W,
            height: PLACEHOLDER_H,
            borderWidth: 1,
            borderColor: colors.outline,
            borderRadius: 10,
            backgroundColor: "rgba(255,255,255,0.05)",
          }} />
        ) : dragging && !showPlaceholder ? (
          <View style={{
            width: PLACEHOLDER_W,
            height: PLACEHOLDER_H,
            backgroundColor: "transparent",
          }} />
        ) : !dragging ? (
          <Card card={card} small={small} noMargin responsive={responsive} />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}
