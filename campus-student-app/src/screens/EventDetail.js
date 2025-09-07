import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function EventDetail({ route }) {
  const event = route?.params?.event || {};
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{event.title || "Event Detail"}</Text>
      <Text style={styles.meta}>{event.type || ""} • {event.date || ""}</Text>
      <Text style={styles.desc}>{event.description || "No description provided."}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff", flexGrow: 1 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  meta: { color: "#666", marginBottom: 12 },
  desc: { fontSize: 16, lineHeight: 22 },
});
