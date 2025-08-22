import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, Image, Pressable, StyleSheet } from "react-native";
import { connectSocket, onSocketEvent, emit } from "../net/socket";
import { useGame } from "../state/useGame";
import { colors } from "../theme/colors";
import Panel from "../components/Panel";
import BackButton from "../components/BackButton";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { SERVER_URL } from "../config/env";

export default function Lobby({ navigation }) {
  const [room, setRoom] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(null);
  const applyEvent = useGame(s => s.applyEvent);

  const loadProfileData = async () => {
    try {
      const token = await SecureStore.getItemAsync("ofc_jwt");
      if (!token) return;
      console.log("Loading profile with token:", token.substring(0, 20) + "...");
      
      const r = await axios.get(`${SERVER_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
      console.log("Profile loaded - username:", r.data?.username || "none");
      console.log("Avatar:", r.data?.avatar ? "Present" : "Not present");
      
      setAvatar(r.data?.avatar || null);
      if (r.data?.username) {
        setUsername(r.data.username);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate("Profile")} style={{ marginRight: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.outline, overflow: 'hidden', alignItems:'center', justifyContent:'center', backgroundColor: colors.panel2 }}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: 32, height: 32 }} />
            ) : (
              <Text style={{ color: colors.text, fontWeight:'700' }}>{(username || 'U').slice(0,1).toUpperCase()}</Text>
            )}
          </View>
        </Pressable>
      )
    });
  }, [navigation, avatar, username]);

  useEffect(() => {
    // Load profile data on initial load
    loadProfileData();

    // Add focus listener to reload profile data when returning to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      console.log("Lobby screen focused - reloading profile data");
      loadProfileData();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    let off = () => {};
    (async () => {
      try {
        await connectSocket();
        off = onSocketEvent((evt, data) => {
          if (evt === "room:create" && data?.roomId) {
            setRoom(data.roomId);
            emit("room:join", { roomId: data.roomId, name: username || "Player" });
            // Navigate to room immediately when room is created
            navigation.navigate("Room", { roomId: data.roomId });
          }
          applyEvent(evt, data);
        });
      } catch {
        navigation.replace("AuthPhone");
      }
    })();
    return () => off();
  }, [username]);

  const handleSignOut = async () => {
    try {
      // Clear all stored data
      await SecureStore.deleteItemAsync("ofc_jwt");
      await SecureStore.deleteItemAsync("ofc_userId");
      await SecureStore.deleteItemAsync("ofc_phone");
      
      // Navigate back to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: "AuthPhone" }],
      });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <View style={{ flex:1, backgroundColor: colors.bg, padding:16, gap:12 }}>
      <BackButton title="Sign Out" onPress={handleSignOut} />
      
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <Pressable onPress={() => navigation.navigate("Profile")} style={styles.profileButton}>
          <View style={styles.profileCircle}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.profileImage} />
            ) : (
              <Text style={styles.profileInitial}>{(username || 'U').slice(0,1).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.profileName}>{username || "Player"}</Text>
        </Pressable>
      </View>

      <Panel style={{ gap:10 }}>
        <Button title="Create Room" onPress={() => emit("room:create")} />
      </Panel>

      <Panel style={{ gap:10 }}>
        <Text style={{ color: colors.sub }}>4-Digit Room Code</Text>
        <TextInput
          value={room}
          onChangeText={setRoom}
          placeholder="e.g. 1234"
          placeholderTextColor={colors.sub}
          keyboardType="number-pad"
          maxLength={4}
          style={{ 
            borderWidth: 1, 
            borderColor: colors.outline, 
            borderRadius: 10, 
            padding: 12, 
            color: colors.text, 
            backgroundColor: colors.panel2,
            fontSize: 16,
            textAlign: 'center',
            fontWeight: '600'
          }}
        />
        <Button
          title="Join Room"
          onPress={() => {
            const code = room.trim();
            if (!code) return;
            emit("room:join", { roomId: code, name: username || "Player" });
            navigation.navigate("Room", { roomId: code });
          }}
        />
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 20,
  },
  profileButton: {
    alignItems: 'center',
  },
  profileCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.outline,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
});
