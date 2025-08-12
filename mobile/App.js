// mobile/App.js
import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { DragProvider } from "./app/drag/DragContext";
import AuthPhone from "./app/screens/AuthPhone";
import AuthCode from "./app/screens/AuthCode";
import CreateUsername from "./app/screens/CreateUsername";
import Lobby from "./app/screens/Lobby";
import Room from "./app/screens/Room";
import Play from "./app/screens/Play";
import Profile from "./app/screens/Profile";
import { initSfx } from "./app/sound/sfx";

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => { initSfx(); }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DragProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="AuthPhone"
            screenOptions={{ 
              headerShown: false,
              gestureEnabled: false
            }}
          >
            <Stack.Screen
              name="AuthPhone"
              component={AuthPhone}
              options={{ title: "Sign in" }}
            />
            <Stack.Screen
              name="AuthCode"
              component={AuthCode}
              options={{ title: "Verify" }}
            />
            <Stack.Screen
              name="CreateUsername"
              component={CreateUsername}
              options={{ title: "Create Username" }}
            />
            <Stack.Screen name="Lobby" component={Lobby} />
            <Stack.Screen name="Room" component={Room} />
            <Stack.Screen name="Play" component={Play} />
            <Stack.Screen name="Profile" component={Profile} />
          </Stack.Navigator>
        </NavigationContainer>
      </DragProvider>
    </GestureHandlerRootView>
  );
}
