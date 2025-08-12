import React, { createContext, useContext, useMemo, useState } from "react";
import { View } from "react-native";
import Card from "../components/Card";

/**
 * drag = { card: "As", x, y, offsetX, offsetY, small: boolean }
 * The overlay renders <Card> from the data (no JSX from worklets).
 */
const DragCtx = createContext(null);

export function DragProvider({ children }) {
  const [drag, setDrag] = useState(null);

  const api = useMemo(
    () => ({
      begin: ({ card, x, y, offsetX = 0, offsetY = 0, small = false }) =>
        setDrag({ card, x, y, offsetX, offsetY, small }),
      move: (x, y) => setDrag((d) => (d ? { ...d, x, y } : d)),
      end: () => setDrag(null),
      drag,
    }),
    [drag]
  );

  return (
    <DragCtx.Provider value={api}>
      <View style={{ flex: 1 }}>{children}</View>

      {/* Global overlay on top of everything */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
        }}
      >
        {drag && (
          <View
            style={{
              position: "absolute",
              transform: [
                { translateX: drag.x - drag.offsetX },
                { translateY: drag.y - drag.offsetY },
                { scale: 1.1 }, // 10% bigger when dragging
              ],
            }}
          >
            <Card card={drag.card} small={drag.small} noMargin />
          </View>
        )}
      </View>
    </DragCtx.Provider>
  );
}

export function useDrag() {
  const ctx = useContext(DragCtx);
  if (!ctx) throw new Error("useDrag must be used inside <DragProvider>");
  return ctx;
}
