import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { SERVER_URL } from "../config/env";

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
    <View style={styles.container}>
      <Text style={styles.title}>Choose your username</Text>
      <Text style={styles.subtitle}>
        This will be your display name in the game. You cannot change it later.
      </Text>
      
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Enter username (3-20 characters)"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        maxLength={20}
      />
      
      <Button 
        title={isLoading ? "Creating..." : "Create Account"} 
        onPress={createUsername}
        disabled={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
});
