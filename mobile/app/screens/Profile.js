import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, Alert, Image, Pressable, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
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
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!perm.granted) {
        Alert.alert("Permission required", "We need access to your photos to select an avatar.");
        return;
      }
      
      // Use lower quality and smaller size for better performance
      const res = await ImagePicker.launchImageLibraryAsync({ 
        base64: true, 
        quality: 0.5, 
        allowsEditing: true, 
        aspect: [1,1],
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false
      });
      
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.base64) {
        Alert.alert("Error", "Could not process image");
        return;
      }
      
      // Resize image to 250x250 pixels
      const resizedImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 250, height: 250 } }],
        { 
          compress: 0.8, 
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true 
        }
      );
      
      const dataUrl = `data:image/jpeg;base64,${resizedImage.base64}`;
      
      // Check if image is too large (should be much smaller now)
      if (dataUrl.length > 500_000) { // 500KB limit for resized images
        Alert.alert("Error", "Image is still too large after compression. Please try a different image.");
        return;
      }
      
      const token = await SecureStore.getItemAsync("ofc_jwt");
      const response = await axios.post(`${SERVER_URL}/me/avatar`, { avatar: dataUrl }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAvatar(dataUrl);
      Alert.alert("Saved", "Avatar updated");
    } catch (error) {
      console.error("Avatar upload error:", error);
      Alert.alert("Error", `Could not update avatar: ${error.response?.data?.error || error.message}`);
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

      {/* Avatar and Username Section */}
      <View style={styles.avatarSection}>
        <Pressable onPress={pickAvatar} style={styles.avatarButton}>
          <View style={styles.avatarCircle}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{(username || 'U').slice(0,1).toUpperCase()}</Text>
                <Text style={styles.avatarPlaceholderText}>Tap to change avatar</Text>
              </View>
            )}
          </View>
        </Pressable>
        
        {/* Username centered under avatar */}
        <Text style={styles.usernameText}>{username || "Player"}</Text>
        
        {/* Chips Display */}
        <View style={styles.accountNumberContainer}>
          <Text style={styles.accountNumberLabel}>Chips</Text>
          <View style={styles.chipDisplay}>
            <Text style={styles.chipAmount}>{profile?.chips || 1000}</Text>
            <Image 
              source={require('../../assets/images/chips.png')} 
              style={styles.chipIcon} 
            />
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Life Time Stats</Text>
          <Text style={styles.headerSubtitle}>Number of Hands {hands}</Text>
        </View>
        
        {/* Stats Table */}
        <View style={styles.statsTable}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.headerCell}>Royalties per Hand</Text>
            <Text style={styles.headerCell}>Fantasy Land %</Text>
            <Text style={styles.headerCell}>Foul Percentage</Text>
          </View>
          
          {/* Table Row */}
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>{rph}</Text>
            <Text style={styles.tableCell}>{flPct}%</Text>
            <Text style={styles.tableCell}>{foulPct}%</Text>
          </View>
        </View>
        
        {/* New Stats Section */}
        <View style={styles.newStatsSection}>
          <Text style={styles.newStatsTitle}>Performance Stats</Text>
          <View style={styles.newStatsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Hands Won</Text>
              <Text style={styles.statValue}>{profile?.stats?.handsWon || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Win Rate</Text>
              <Text style={styles.statValue}>
                {hands > 0 ? Math.round(((profile?.stats?.handsWon || 0) / hands) * 100) : 0}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Matches Played</Text>
              <Text style={styles.statValue}>{profile?.stats?.matchesPlayed || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Matches Won</Text>
              <Text style={styles.statValue}>{profile?.stats?.matchesWon || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Match Win Rate</Text>
              <Text style={styles.statValue}>
                {profile?.stats?.matchesPlayed > 0 ? Math.round(((profile?.stats?.matchesWon || 0) / profile?.stats?.matchesPlayed) * 100) : 0}%
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
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
    marginBottom: 4,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  avatarPlaceholderText: {
    color: colors.sub,
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  usernameText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  accountNumberContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  accountNumberLabel: {
    color: colors.sub,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  chipDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAmount: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  chipIcon: {
    width: 24,
    height: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.sub,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.sub,
    fontSize: 14,
    fontWeight: '600',
  },
  statsTable: {
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.outline,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  headerCell: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  newStatsSection: {
    marginTop: 24,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 10,
    padding: 16,
  },
  newStatsTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  newStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    marginVertical: 8,
    width: '45%', // Adjust as needed for 2 columns
  },
  statLabel: {
    color: colors.sub,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
}); 