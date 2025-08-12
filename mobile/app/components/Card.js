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

function Face({ card, selected, small, tiny, micro }) {
  const { rank, sym, suit } = parse(card);
  const w = micro ? 50 : tiny ? 40 : small ? 62 : 64;
  const h = micro ? 70 : tiny ? 56 : small ? 92 : 88;

  // Larger typography
  const rankSize = micro ? 22 : tiny ? 18 : small ? 26 : 30;
  const suitSize = micro ? 26 : tiny ? 24 : small ? 30 : 30;
  const ink = SUIT_COLOR[suit] || "#111";

  return (
    <View
      style={{
        width: w, height: h, borderRadius: 10, borderWidth: 2,
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

export default function Card({ card, selected, onPress, small=false, tiny=false, micro=false, noMargin=false }) {
  const wrapperStyle = noMargin ? null : { marginRight: 10 };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={wrapperStyle}>
        <Face card={card} selected={selected} small={small} tiny={tiny} micro={micro} />
      </Pressable>
    );
  }
  return (
    <View style={wrapperStyle}>
      <Face card={card} selected={selected} small={small} tiny={tiny} micro={micro} />
    </View>
  );
}
