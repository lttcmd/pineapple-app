import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { SERVER_URL } from "../config/env";

export default function AuthCode({ navigation }) {
  const [code, setCode] = useState("");

  async function verify() {
    try {
      const phone = await SecureStore.getItemAsync("ofc_phone");
      const r = await axios.post(`${SERVER_URL}/auth/verify`, { phone, code: code.trim() });
      const { token, userId, isNewUser, hasUsername } = r.data;
      
      await SecureStore.setItemAsync("ofc_jwt", token);
      await SecureStore.setItemAsync("ofc_userId", String(userId));
      
      if (isNewUser || !hasUsername) {
        // New user or user without username - go to create username screen
        navigation.navigate("CreateUsername");
      } else {
        // Existing user with username - go directly to lobby
        navigation.reset({ index: 0, routes: [{ name: "Lobby" }] });
      }
    } catch {
      Alert.alert("Invalid code", "Please try again.");
    }
  }

  return (
    <View style={{ padding:16, gap:12 }}>
      <Text style={{ fontSize:18, fontWeight:"600" }}>Enter the 6-digit code</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        keyboardType="number-pad"
        style={{ borderWidth:1, borderRadius:8, padding:12, letterSpacing:4 }}
      />
      <Button title="Verify" onPress={verify} />
    </View>
  );
}
