import React from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";

export default function BackButton({ title = "Back", style, textStyle, onPress }) {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        {
          position: "absolute",
          top: 60,
          left: 16,
          zIndex: 1000,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 20,
          backgroundColor: colors.panel2,
          borderWidth: 1,
          borderColor: colors.outline,
          flexDirection: "row",
          alignItems: "center",
        },
        style
      ]}
    >
      <Text style={{ fontSize: 24, marginRight: 4, color: colors.text }}>←</Text>
      <Text style={[{ color: colors.text, fontSize: 16 }, textStyle]}>{title}</Text>
    </Pressable>
  );
}
