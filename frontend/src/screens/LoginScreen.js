// frontend/src/screens/LoginScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Toast from "react-native-toast-message";
import { login } from "../services/api.rn";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation, onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (!email || !password) return Alert.alert("Validation", "Enter email and password");
    setLoading(true);
    try {
      // Use api.rn login (axios) which stores token in AsyncStorage
      const res = await login(email, password);
      // login saved token if backend returned one
      Toast.show({ type: "success", text1: "Signed in" });
      if (typeof onSignIn === "function") onSignIn();
    } catch (err) {
      console.error("login error", err);
      const msg = err?.response?.data?.error || err?.message || "Login failed";
      Toast.show({ type: "error", text1: "Login failed", text2: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.title}>Sign in</Text>

        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

        <TouchableOpacity style={styles.btn} onPress={doLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign in</Text>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => Alert.alert("Sign up", "Sign up via web portal.")}>
            <Text style={styles.link}> Sign up on web</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", justifyContent: "center", padding: 16 },
  box: { backgroundColor: "#fff", padding: 16, borderRadius: 8, elevation: 2 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  btn: { backgroundColor: "#007bff", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 6 },
  btnText: { color: "#fff", fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 14 },
  footerText: { color: "#666" },
  link: { color: "#007bff", fontWeight: "600" },
});
