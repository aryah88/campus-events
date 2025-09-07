// App.js
if (__DEV__) {
  // Force the mobile app to use your PC's LAN IP for API calls.
  // Replace the IP below with your Windows machine's IPv4 address from ipconfig.
  global.USE_LAN_API = true;
  global.LAN_IP = "192.168.202.180"; // <-- REPLACE with your PC's IPv4 (no http, no port)
  // Optional quick override (exact URL): uncomment to force a full URL instead of IP+port
  // global.DEV_API_URL = "http://192.168.202.180:5000";
}
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import { whoami } from "./src/services/api.rn";
import { LogBox, View, ActivityIndicator } from "react-native";

LogBox.ignoreAllLogs(true); // optional, remove for development if you want full logs

const Stack = createNativeStackNavigator();

export default function App() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await whoami();
        setAuthed(!!(me && me.authenticated));
      } catch (e) {
        setAuthed(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {authed ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
