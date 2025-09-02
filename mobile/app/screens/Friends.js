import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { colors } from "../theme/colors";
import Panel from "../components/Panel";
import BackButton from "../components/BackButton";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { SERVER_URL } from "../config/env";

export default function Friends({ navigation }) {
  const [username, setUsername] = useState("");
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFriends();
    loadPendingRequests();
    
    // Add focus listener to refresh friends list when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadFriends();
      loadPendingRequests();
    });

    // Set up periodic refresh for real-time online status
    const refreshInterval = setInterval(() => {
      loadFriends();
    }, 10000); // Refresh every 10 seconds

    return () => {
      unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [navigation]);

  const loadFriends = async () => {
    try {
      const token = await SecureStore.getItemAsync("ofc_jwt");
      if (!token) return;

      const response = await axios.get(`${SERVER_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriends(response.data);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const token = await SecureStore.getItemAsync("ofc_jwt");
      if (!token) return;

      const response = await axios.get(`${SERVER_URL}/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingRequests(response.data);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const addFriend = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("ofc_jwt");
      if (!token) return;

      const response = await axios.post(`${SERVER_URL}/friends/request`, {
        username: username.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        Alert.alert("Success", `Friend request sent to ${username}`);
        setUsername("");
      } else {
        Alert.alert("Error", response.data.error || "Failed to send friend request");
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      Alert.alert("Error", "Failed to send friend request");
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (requestId, accept) => {
    try {
      const token = await SecureStore.getItemAsync("ofc_jwt");
      if (!token) return;

      const response = await axios.post(`${SERVER_URL}/friends/respond`, {
        requestId,
        accept
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        Alert.alert("Success", accept ? "Friend request accepted!" : "Friend request declined");
        loadFriends();
        loadPendingRequests();
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      Alert.alert("Error", "Failed to respond to friend request");
    }
  };

  const removeFriend = async (friendId) => {
    Alert.alert(
      "Remove Friend",
      "Are you sure you want to remove this friend?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync("ofc_jwt");
              if (!token) return;

              const response = await axios.delete(`${SERVER_URL}/friends/${friendId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });

              if (response.data.success) {
                Alert.alert("Success", "Friend removed");
                loadFriends();
              }
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert("Error", "Failed to remove friend");
            }
          }
        }
      ]
    );
  };

  const renderFriend = ({ item }) => (
    <View style={styles.friendItem}>
      <View style={styles.friendInfo}>
        <Text style={styles.friendUsername}>{item.username}</Text>
        <Text style={styles.friendStatus}>{item.online ? "🟢 Online" : "⚫ Offline"}</Text>
      </View>
      <Pressable
        style={styles.removeButton}
        onPress={() => removeFriend(item.id)}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </Pressable>
    </View>
  );

  const renderPendingRequest = ({ item }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestInfo}>
        <Text style={styles.requestUsername}>{item.username}</Text>
        <Text style={styles.requestText}>wants to be your friend</Text>
      </View>
      <View style={styles.requestButtons}>
        <Pressable
          style={[styles.requestButton, styles.acceptButton]}
          onPress={() => respondToRequest(item.id, true)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </Pressable>
        <Pressable
          style={[styles.requestButton, styles.declineButton]}
          onPress={() => respondToRequest(item.id, false)}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <BackButton title="Back" onPress={() => navigation.goBack()} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.subtitle}>Connect with other players</Text>
      </View>

      {/* Add Friend Section */}
      <Panel style={styles.addFriendPanel}>
        <Text style={styles.sectionTitle}>Add Friend</Text>
        <View style={styles.addFriendInput}>
          <TextInput
            style={styles.usernameInput}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={colors.sub}
          />
          <Button
            title="Add"
            onPress={addFriend}
            disabled={loading || !username.trim()}
          />
        </View>
      </Panel>

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <Panel style={styles.requestsPanel}>
          <Text style={styles.sectionTitle}>Pending Requests ({pendingRequests.length})</Text>
          <FlatList
            data={pendingRequests}
            renderItem={renderPendingRequest}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </Panel>
      )}

      {/* Friends List Section */}
      <Panel style={styles.friendsPanel}>
        <Text style={styles.sectionTitle}>Friends ({friends.length})</Text>
        <Pressable onPress={loadFriends} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
        </Pressable>
        {friends.length === 0 ? (
          <Text style={styles.noFriendsText}>No friends yet. Add some friends to get started!</Text>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        )}
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
    gap: 12,
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.sub,
    textAlign: 'center',
  },
  addFriendPanel: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  addFriendInput: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  usernameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.panel2,
  },
  requestsPanel: {
    gap: 12,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.panel2,
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  requestUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  requestText: {
    fontSize: 14,
    color: colors.sub,
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    color: colors.bg,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: colors.danger,
  },
  declineButtonText: {
    color: colors.bg,
    fontWeight: '600',
  },
  friendsPanel: {
    gap: 12,
  },
  noFriendsText: {
    textAlign: 'center',
    color: colors.sub,
    fontStyle: 'italic',
    padding: 20,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.panel2,
    marginBottom: 8,
  },
  friendInfo: {
    flex: 1,
  },
  friendUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  friendStatus: {
    fontSize: 14,
    color: colors.sub,
  },
  removeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: colors.danger,
    minWidth: 70,
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.bg,
    fontWeight: '600',
  },
  refreshButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: colors.outline,
    marginBottom: 12,
  },
  refreshButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
});
