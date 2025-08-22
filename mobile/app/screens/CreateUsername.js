import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, SafeAreaView } from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { SERVER_URL } from "../config/env";
import { colors } from "../theme/colors";

export default function CreateUsername({ navigation }) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function createUsername() {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }

    if (username.length < 3 || username.length > 20) {
      Alert.alert("Error", "Username must be 3-20 characters");
      return;
    }

    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync("ofc_jwt");
      await axios.post(`${SERVER_URL}/auth/create-username`, {
        token,
        username: username.trim()
      });
      
      // Navigate to lobby
      navigation.reset({ index: 0, routes: [{ name: "Lobby" }] });
    } catch (error) {
      console.error('Error creating username:', error);
      if (error.response?.data?.error) {
        Alert.alert("Error", error.response.data.error);
      } else {
        Alert.alert("Error", "Could not create username. Please try again.");
      }
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
            color: colors.text,
            marginBottom: 8
          }}>
            Choose Your Username
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: colors.sub,
            textAlign: 'center'
          }}>
            This cannot be changed.
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: "600",
            color: colors.text,
            marginBottom: 8
          }}>
            Username
          </Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username (3-20 characters)"
            placeholderTextColor={colors.sub}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
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
          onPress={createUsername}
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
            color: isLoading ? colors.sub : colors.text,
            fontSize: 16,
            fontWeight: '600'
          }}>
            {isLoading ? "Creating..." : "Create Account"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}