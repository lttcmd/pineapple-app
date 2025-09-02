import React from "react";
import { View, Text, Button, StyleSheet, Pressable } from "react-native";
import { colors } from "../theme/colors";
import Panel from "../components/Panel";
import BackButton from "../components/BackButton";
import * as SecureStore from "expo-secure-store";

export default function Settings({ navigation }) {
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
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 }}>
      <BackButton title="Back" onPress={() => navigation.goBack()} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account and preferences</Text>
      </View>

      <Panel style={{ gap: 10 }}>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Sound Effects</Text>
          <Text style={styles.settingValue}>On</Text>
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Notifications</Text>
          <Text style={styles.settingValue}>Off</Text>
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Theme</Text>
          <Text style={styles.settingValue}>Dark</Text>
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Language</Text>
          <Text style={styles.settingValue}>English</Text>
        </View>
      </Panel>

      <Panel style={{ gap: 10 }}>
        <Button 
          title="Sign Out" 
          onPress={handleSignOut}
          color={colors.danger}
        />
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.panel2,
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  settingArrow: {
    fontSize: 20,
    color: colors.sub,
    fontWeight: 'bold',
  },
  settingValue: {
    fontSize: 16,
    color: colors.sub,
    fontWeight: '400',
  },
});
