import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { SERVER_URL } from "../config/env";

export default function AuthPhone({ navigation }) {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function sendCode() {
    try {
      const p = phone.trim();
      if (!p) {
        Alert.alert("Error", "Please enter a phone number");
        return;
      }
      
      setIsLoading(true);
      console.log("Sending OTP to:", p);
      console.log("Server URL:", SERVER_URL);
      
      const response = await axios.post(`${SERVER_URL}/auth/send-otp`, { phone: p });
      console.log("Response:", response.data);
      
      await SecureStore.setItemAsync("ofc_phone", p);
      navigation.navigate("AuthCode");
    } catch (e) {
      console.error("Error sending code:", e);
      console.error("Error response:", e.response?.data);
      console.error("Error status:", e.response?.status);
      Alert.alert("Error", `Could not send code: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={{ padding:16, gap:12 }}>
      <Text style={{ fontSize:18, fontWeight:"600" }}>Enter phone number</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="+61 4xx xxx xxx"
        autoCapitalize="none"
        keyboardType="phone-pad"
        style={{ borderWidth:1, borderRadius:8, padding:12 }}
      />
      <Button 
        title={isLoading ? "Sending..." : "Send code"} 
        onPress={sendCode}
        disabled={isLoading}
      />
    </View>
  );
}
