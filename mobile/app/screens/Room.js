import React, { useEffect, useState } from "react";
import { View, Text, Button, FlatList } from "react-native";
import { onSocketEvent, emit } from "../net/socket";
import { useGame } from "../state/useGame";
import Panel from "../components/Panel";
import BackButton from "../components/BackButton";
import { colors } from "../theme/colors";

export default function Room({ route, navigation }) {
  const { roomId } = route.params || {};
  const { players, nextRoundReady } = useGame();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const off = onSocketEvent((evt, data) => {
      if (evt === "room:state" && data?.phase && data.phase !== "lobby") {
        navigation.replace("Play", { roomId: data.roomId });
      }
      if (evt === "round:next-ready") {
        // Update local ready state
        const myUserId = useGame.getState().userId;
        setIsReady(data?.readyPlayers?.includes(myUserId) || false);
      }
    });
    return () => off();
  }, [navigation]);

  const handleReadyPress = () => {
    emit("round:start", { roomId });
    setIsReady(true);
  };

  return (
    <View style={{ flex:1, backgroundColor: colors.bg, padding:16, gap:12 }}>
      <BackButton title="" />
      <Text style={{ color: colors.text, fontSize:20, fontWeight:"800", marginTop: 120 }}>Room: {roomId}</Text>

      <Panel>
        <Text style={{ color: colors.sub, marginBottom: 8 }}>Players</Text>
        <FlatList
          data={players}
          keyExtractor={(p) => String(p.userId)}
          renderItem={({ item }) => (
            <View style={{ flexDirection:"row", justifyContent:"space-between", paddingVertical:6 }}>
              <Text style={{ color: colors.text }}>{item.name}</Text>
              <Text style={{ color: nextRoundReady.has(item.userId) ? colors.ok : colors.sub }}>
                {nextRoundReady.has(item.userId) ? "ready" : "waiting"}
              </Text>
            </View>
          )}
        />
      </Panel>

      <Button 
        title={isReady ? "Waiting for opponent..." : "Ready"} 
        onPress={handleReadyPress}
        disabled={isReady}
      />
    </View>
  );
}
