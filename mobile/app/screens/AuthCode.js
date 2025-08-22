import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, Alert, SafeAreaView } from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { SERVER_URL } from "../config/env";
import { colors } from "../theme/colors";

export default function AuthCode({ navigation }) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Auto-verify when 6 digits are entered
  useEffect(() => {
    if (code.length === 6) {
      verify();
    }
  }, [code]);

  async function verify() {
    if (isVerifying) return; // Prevent multiple verification attempts
    
    try {
      setIsVerifying(true);
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
    } finally {
      setIsVerifying(false);
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
            color: colors.text,
            marginBottom: 8
          }}>
            Enter Verification Code
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: colors.sub,
            textAlign: 'center'
          }}>
            We sent a 6-digit code to your phone. Enter it below to continue.
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: "600",
            color: colors.text,
            marginBottom: 8
          }}>
            Verification Code
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor={colors.sub}
            keyboardType="number-pad"
            maxLength={6}
            editable={!isVerifying}
            style={{ 
              borderWidth: 1, 
              borderRadius: 12, 
              padding: 16,
              fontSize: 18,
              backgroundColor: colors.panel,
              borderColor: isVerifying ? colors.accent : colors.outline,
              color: colors.text,
              letterSpacing: 4,
              textAlign: 'center',
              fontWeight: '600'
            }}
          />
        </View>

        <Pressable
          onPress={verify}
          disabled={isVerifying || code.length !== 6}
          style={{
            backgroundColor: (isVerifying || code.length !== 6) ? colors.outline : colors.accent,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            marginTop: 16
          }}
        >
          <Text style={{ 
            color: (isVerifying || code.length !== 6) ? colors.sub : colors.text,
            fontSize: 16,
            fontWeight: '600'
          }}>
            {isVerifying ? "Verifying..." : "Verify Code"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
