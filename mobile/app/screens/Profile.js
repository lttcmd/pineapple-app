import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, Alert, Image, Pressable, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { SERVER_URL } from "../config/env";
import { colors } from "../theme/colors";
import BackButton from "../components/BackButton";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("ofc_jwt");
      const r = await axios.get(`${SERVER_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(r.data);
      setUsername(r.data?.username || "");
      setAvatar(r.data?.avatar || null);
    } catch (e) {
      Alert.alert("Error", "Could not load profile");
    } finally {
      setLoading(false);
    }
  }

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "We need access to your photos to select an avatar.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8, allowsEditing: true, aspect: [1,1] });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.base64) return;
    const dataUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
    try {
      const token = await SecureStore.getItemAsync("ofc_jwt");
      await axios.post(`${SERVER_URL}/me/avatar`, { avatar: dataUrl }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvatar(dataUrl);
      Alert.alert("Saved", "Avatar updated");
    } catch {
      Alert.alert("Error", "Could not update avatar");
    }
  }

  useEffect(() => { load(); }, []);

  const stats = profile?.stats || { hands: 0, royaltiesTotal: 0, fantasyEntrances: 0, fouls: 0 };
  const hands = stats.hands || 0;
  const rph = hands > 0 ? (stats.royaltiesTotal / hands).toFixed(2) : "0.00";
  const flPct = hands > 0 ? Math.round((stats.fantasyEntrances / hands) * 100) : 0;
  const foulPct = hands > 0 ? Math.round((stats.fouls / hands) * 100) : 0;

  if (loading) {
    return (
      <View style={{ flex:1, backgroundColor: colors.bg, padding:16, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex:1, backgroundColor: colors.bg, padding:16 }}>
      <BackButton title="" />
      <Text style={{ color: colors.text, fontSize:20, fontWeight:"800", marginBottom: 12, marginTop: 80 }}>Profile</Text>

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <Pressable onPress={pickAvatar} style={styles.avatarButton}>
          <View style={styles.avatarCircle}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>{(username || 'U').slice(0,1).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.avatarText}>Tap to change avatar</Text>
        </Pressable>
      </View>

      {/* Username Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Username</Text>
        <View style={styles.usernameContainer}>
          <Text style={styles.usernameText}>{username || "Player"}</Text>
          <Text style={styles.usernameNote}>Username cannot be changed</Text>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>RPH:</Text>
            <Text style={styles.statValue}>{rph}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Fantasy Land %:</Text>
            <Text style={styles.statValue}>{flPct}%</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Foul %:</Text>
            <Text style={styles.statValue}>{foulPct}%</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Hands Played:</Text>
            <Text style={styles.statValue}>{hands}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarButton: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.outline,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.text,
  },
  avatarText: {
    color: colors.sub,
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.sub,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  usernameContainer: {
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 10,
    padding: 12,
  },
  usernameText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  usernameNote: {
    color: colors.sub,
    fontSize: 12,
    marginTop: 4,
  },
  statsContainer: {
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 10,
    padding: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    color: colors.text,
    fontSize: 14,
  },
  statValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
}); 