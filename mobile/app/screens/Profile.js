import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, Alert, Image, Pressable } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { SERVER_URL } from "../config/env";
import { colors } from "../theme/colors";
import BackButton from "../components/BackButton";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("ofc_jwt");
      const r = await axios.get(`${SERVER_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(r.data);
      setName(r.data?.name || "");
      setAvatar(r.data?.avatar || null);
    } catch (e) {
      Alert.alert("Error", "Could not load profile");
    } finally {
      setLoading(false);
    }
  }

  async function saveName() {
    try {
      const token = await SecureStore.getItemAsync("ofc_jwt");
      await axios.post(`${SERVER_URL}/me/name`, { name }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert("Saved", "Name set");
      load();
    } catch (e) {
      const msg = e?.response?.data?.error || "Could not set name";
      Alert.alert("Error", msg);
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

  return (
    <View style={{ flex:1, backgroundColor: colors.bg, padding:16 }}>
      <BackButton title="Back" />
      <Text style={{ color: colors.text, fontSize:20, fontWeight:"800", marginBottom: 12, marginTop: 80 }}>Profile</Text>

      {/* Avatar */}
      <View style={{ alignItems:'center', marginBottom: 16 }}>
        <Pressable onPress={pickAvatar}>
          <View style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: colors.outline, overflow:'hidden', alignItems:'center', justifyContent:'center', backgroundColor: colors.panel2 }}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: 88, height: 88 }} />
            ) : (
              <Text style={{ color: colors.text, fontSize: 28, fontWeight:'800' }}>{(name || 'U').slice(0,1).toUpperCase()}</Text>
            )}
          </View>
        </Pressable>
        <Text style={{ color: colors.sub, marginTop: 8 }}>Tap to change avatar</Text>
      </View>

      {/* Name (one-time set) */}
      <Text style={{ color: colors.sub, marginBottom: 6 }}>Display name</Text>
      <View style={{ flexDirection:'row', alignItems:'center', marginBottom: 16 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          editable={!profile?.name}
          placeholder="Your name"
          placeholderTextColor="#9aa4bf"
          style={{ flex:1, borderWidth:1, borderColor: colors.outline, borderRadius:10, padding:12, color: colors.text, backgroundColor: colors.panel2, opacity: profile?.name ? 0.6 : 1 }}
        />
        <View style={{ width: 12 }} />
        <Button title="Set" onPress={saveName} disabled={!!profile?.name} />
      </View>

      {/* Stats only (no player ID shown) */}
      <Text style={{ color: colors.sub, marginBottom: 8 }}>Stats</Text>
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.text }}>RPH: {rph}</Text>
        <Text style={{ color: colors.text }}>Fantasy land %: {flPct}%</Text>
        <Text style={{ color: colors.text }}>Foul %: {foulPct}%</Text>
        <Text style={{ color: colors.sub }}>Hands played: {hands}</Text>
      </View>
    </View>
  );
} 