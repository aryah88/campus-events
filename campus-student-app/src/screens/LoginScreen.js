// src/screens/LoginScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Toast from "react-native-toast-message";
import { login, getEvents, whoami } from "../services/api.rn";

export default function LoginScreen({ onSignIn }) {
  // If you want a pre-filled value for quick testing, uncomment:
  // const [email, setEmail] = useState("stu1@gmail.com");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  // helper to show server-sent error message or fallback
  function showError(err) {
    const msg = err?.message || (err && String(err)) || "Unknown error";
      const cleanEmail = email.trim().toLowerCase();
      const res = await login(cleanEmail, password);
      console.log("Login response:", res);
  const doLogin = async () => {
  if (!email || !password) return Alert.alert("Validation", "Enter email & password");
  setLoading(true);
  try {
    const cleanEmail = email.trim().toLowerCase();

    // login() stores token in AsyncStorage (api.rn). Ensure it finished.
    const res = await login(cleanEmail, password);
    console.log("Login response:", res);

    // Give a tiny pause to ensure AsyncStorage write fully flushed (very small)
    // (only if you suspect races; usually unnecessary if api.rn awaits setItem)
    await new Promise((r) => setTimeout(r, 200));

    // Confirm identity from backend using the stored token
    const who = await whoami();
    console.log("whoami after login:", who);

    if (!who || !who.authenticated) {
      // Not authenticated even after login -> show error
      Alert.alert("Login", "Login succeeded but authentication failed. Try again.");
      return;
    }

    Toast.show({ type: "success", text1: "Signed in" });

    // Reset navigation and pass a refresh param so Home can reload data
    navigation.reset({
      index: 0,
      routes: [{ name: "Home", params: { refreshedAfterLogin: Date.now() } }],
    });
  } catch (err) {
    console.error("login error", err);
    if (err?.response?.data?.error) {
      Alert.alert("Login failed", err.response.data.error);
    } else {
      Alert.alert("Login failed", err.message || String(err));
    }
  } finally {
    setLoading(false);
  }
};


  const testBackend = async () => {
    setTesting(true);
    try {
      const who = await whoami();
      console.log("[LoginScreen] whoami:", who);

      const events = await getEvents();
      console.log("[LoginScreen] getEvents result:", events);

      
      // Call the onSignIn callback to refresh auth state
      if (typeof onSignIn === "function") {
        await onSignIn();
      }
    } catch (err) {
      if (err?.response?.data?.error) {
        Toast.show({ type: "error", text1: "Login failed", text2: err.response.data.error });
      } else {
        Toast.show({ type: "error", text1: "Login failed", text2: err.message || String(err) });
      }
    } finally {
      setTesting(false);
    }
  };

  const showToken = async () => {
    const t = await AsyncStorage.getItem("token");
    Alert.alert("Stored token", t ? t : "No token stored");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <Toast />
      <View style={styles.box}>
        <Text style={styles.title}>Campus Events — Student</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          autoCorrect={false}
          textContentType="username"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
        <Text style={styles.title}>Campus Events — Student</Text>
          style={styles.input}
        <TextInput 
          style={styles.input} 
          placeholder="Email" 
          autoCapitalize="none" 
          keyboardType="email-address"
          value={email} 
          onChangeText={setEmail}
          autoCorrect={false}
          textContentType="username"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          secureTextEntry 
          value={password} 
          onChangeText={setPassword}
          textContentType="password"
        />

        <TouchableOpacity onPress={doLogin} style={styles.btn} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign in</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={testBackend}
          style={[styles.btn, { backgroundColor: "#444", marginTop: 8 }]}
          disabled={testing}
      </View>

      <Toast />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  box: { padding: 16, borderRadius: 8 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12, textAlign: "center" },
});
