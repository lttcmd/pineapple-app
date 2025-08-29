import React from "react";
import { Pressable, View, Text } from "react-native";
import { colors } from "../theme/colors";

const SUIT = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_COLOR = {
  h: "#E53935", // hearts red
  d: "#1E88E5", // diamonds blue
  c: "#2E7D32", // clubs green
  s: "#111111", // spades black
};

function parse(card) {
  if (!card) return { rank: "?", suit: "?" };
  const rank = card.slice(0, -1);
  const suit = card.slice(-1).toLowerCase();
  return { rank, suit, sym: SUIT[suit] || "?" };
}

function Face({ card, selected, small, tiny, micro, responsive }) {
  const { rank, sym, suit } = parse(card);
  
  // Use responsive dimensions if provided, otherwise fall back to fixed sizes
  let w, h;
  if (responsive) {
    if (micro) {
      w = responsive.SLOT_W * 0.6; // 60% of player card size
      h = responsive.SLOT_H * 0.6;
    } else if (tiny) {
      w = responsive.OPPONENT_SLOT_W; // Use opponent card size
      h = responsive.OPPONENT_SLOT_H;
    } else if (small) {
      w = responsive.SLOT_W; // Use player card size
      h = responsive.SLOT_H;
    } else {
      w = responsive.SLOT_W * 1.1; // Slightly larger than player cards
      h = responsive.SLOT_H * 1.1;
    }
  } else {
    // Fallback to fixed sizes
    w = micro ? 50 : tiny ? 40 : small ? 62 : 64;
    h = micro ? 70 : tiny ? 56 : small ? 92 : 88;
  }

  // Responsive typography - use larger sizes for better readability
  const rankSize = responsive ? (micro ? 18 : tiny ? 16 : small ? 24 : 28) : (micro ? 22 : tiny ? 18 : small ? 26 : 30);
  const suitSize = responsive ? (micro ? 20 : tiny ? 18 : small ? 26 : 30) : (micro ? 26 : tiny ? 24 : small ? 30 : 30);
  const ink = SUIT_COLOR[suit] || "#111";

  return (
    <View
      style={{
        width: w, height: h, borderRadius: 10, borderWidth: 1,
        borderColor: selected ? colors.accent : colors.outline,
        backgroundColor: colors.cardFace,
        justifyContent: "space-between", padding: 6,
        shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
        elevation: 3
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: rankSize, color: ink }}>{rank}</Text>
      <Text style={{ alignSelf: "flex-end", fontSize: suitSize, color: ink }}>{sym}</Text>
    </View>
  );
}

export default function Card({ card, selected, onPress, small=false, tiny=false, micro=false, noMargin=false, responsive=null }) {
  const wrapperStyle = noMargin ? null : { marginRight: 10 };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={wrapperStyle}>
        <Face card={card} selected={selected} small={small} tiny={tiny} micro={micro} responsive={responsive} />
      </Pressable>
    );
  }
  return (
    <View style={wrapperStyle}>
      <Face card={card} selected={selected} small={small} tiny={tiny} micro={micro} responsive={responsive} />
    </View>
  );
}
