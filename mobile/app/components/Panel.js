import React from "react";
import { View } from "react-native";
import { colors } from "../theme/colors";

export default function Panel({ children, style }) {
  return (
    <View style={[{
      backgroundColor: colors.panel,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.outline,
    }, style]}>
      {children}
    </View>
  );
}
