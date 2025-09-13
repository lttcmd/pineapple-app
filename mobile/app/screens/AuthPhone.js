import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, SafeAreaView } from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { SERVER_URL } from "../config/env";
import { colors } from "../theme/colors";

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ 
        flex: 1, 
        padding: 24, 
        justifyContent: 'flex-start',
        paddingTop: 80,
        gap: 24 
      }}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Text style={{ 
            fontSize: 28, 
            fontWeight: "700", 
            color: 'red',
            marginBottom: 8
          }}>
            Heads Up Pineapple
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: 'red',
            textAlign: 'center'
          }}>
            Enter your phone number to get started
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: "600",
            color: 'red',
            marginBottom: 8
          }}>
            Phone Number
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+61 4xx xxx xxx"
            placeholderTextColor={colors.sub}
            autoCapitalize="none"
            keyboardType="phone-pad"
            style={{ 
              borderWidth: 1, 
              borderRadius: 12, 
              padding: 16,
              fontSize: 16,
              backgroundColor: colors.panel,
              borderColor: colors.outline,
              color: colors.text
            }}
          />
        </View>

        <Pressable
          onPress={sendCode}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? colors.outline : colors.accent,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            marginTop: 16
          }}
        >
          <Text style={{ 
            color: 'red',
            fontSize: 16,
            fontWeight: '600'
          }}>
            {isLoading ? "Sending..." : "Send Code"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
