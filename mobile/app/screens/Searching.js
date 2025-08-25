import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { onSocketEvent, emit } from "../net/socket";
import { colors } from "../theme/colors";
import Panel from "../components/Panel";
import BackButton from "../components/BackButton";

export default function Searching({ navigation }) {
  const [searching, setSearching] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [matchedRoomId, setMatchedRoomId] = useState(null);

  useEffect(() => {
    let interval;
    if (searching) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [searching]);

  useEffect(() => {
    let off = () => {};
    
    const setupSocket = async () => {
      off = onSocketEvent((evt, data) => {
        if (evt === "ranked:match-found") {
          setSearching(false);
          setMatchedRoomId(data.roomId);
          // Don't navigate yet - wait for the game to start
        } else if (evt === "ranked:searching") {
          setSearching(data.searching);
        } else if (evt === "round:start") {
          // Game has started, navigate directly to Play
          navigation.replace("Play", { 
            roomId: data.roomId
          });
        }
      });
    };

    setupSocket();

    return () => {
      off();
      // Cancel search when leaving the screen
      emit("ranked:cancel");
    };
  }, [navigation, matchedRoomId]);

  const handleCancel = () => {
    emit("ranked:cancel");
    navigation.goBack();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <BackButton title="Cancel Search" onPress={handleCancel} />
      
      <View style={styles.content}>
        <Panel style={styles.searchingPanel}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.searchingText}>Searching for opponent...</Text>
          <Text style={styles.timeText}>{formatTime(timeElapsed)}</Text>
        </Panel>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingPanel: {
    alignItems: 'center',
    padding: 40,
    gap: 20,
  },
  searchingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accent,
  },
});
