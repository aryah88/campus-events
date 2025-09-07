// src/screens/HomeScreen.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Alert,
  Platform,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import debounce from "lodash.debounce";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

// API client (mobile version)
import {
  getEvents,
  registerForEvent,
  getRegistrationsForStudent,
  submitFeedback,
} from "../services/api.rn";

const EVENT_TYPES = ["All", "Workshop", "Seminar", "Drive", "Hackathon"];

export default function HomeScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  const [registrations, setRegistrations] = useState([]);
  const [studentId, setStudentId] = useState(null); // read from AsyncStorage
  const [editingStudentId, setEditingStudentId] = useState(false);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackEvent, setFeedbackEvent] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // QR modal state
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrEventData, setQrEventData] = useState(null);

  // --- Fetch / load functions ---
  const fetchAll = useCallback(
    async (q = "", type = "All") => {
      setLoading(true);
      try {
        const params = {};
        if (q) params.search = q;
        if (type && type !== "All") params.type = type;
        // getEvents (mobile) returns array of rows
        const res = await getEvents({ collegeId: "c1", ...params });
        // res might be an array already
        const rows = Array.isArray(res) ? res : res.data || [];
        setEvents(rows);
        setFiltered(rows);
      } catch (err) {
        console.error("getEvents error", err);
        Alert.alert("Error", "Could not load events.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchRegistrations = useCallback(
    async (id) => {
      if (!id) return;
      try {
        const res = await getRegistrationsForStudent(id);
        const rows = Array.isArray(res) ? res : res.data || [];
        setRegistrations(rows);
      } catch (err) {
        console.error("getRegistrations error", err);
      }
    },
    []
  );

  // load studentId from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const id = await AsyncStorage.getItem("studentId");
        if (id) {
          setStudentId(id);
          setEditingStudentId(false);
          await fetchRegistrations(id);
        } else {
          setEditingStudentId(true);
        }
      } catch (e) {
        console.warn("failed to load studentId", e);
      } finally {
        // always load events even if no studentId
        await fetchAll();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refresh when screen focused
  useFocusEffect(
    useCallback(() => {
      fetchAll(search, selectedType);
      if (studentId) fetchRegistrations(studentId);
    }, [fetchAll, fetchRegistrations, search, selectedType, studentId])
  );

  // Debounced filter — uses lodash.debounce
  const debouncedSearch = useRef(
    debounce((text, type, sourceEvents) => {
      const q = (text || "").trim().toLowerCase();
      const list = (sourceEvents || events) || [];
      const filteredList = list.filter((ev) => {
        const title = (ev.title || "").toLowerCase();
        const desc = (ev.description || "").toLowerCase();
        const matchesQ = q === "" || title.includes(q) || desc.includes(q);
        const matchesType = type === "All" || ev.type === type;
        return matchesQ && matchesType;
      });
      setFiltered(filteredList);
    }, 300)
  ).current;

  useEffect(() => {
    debouncedSearch(search, selectedType, events);
  }, [search, selectedType, events]);

  const onRegister = async (eventId) => {
    if (!studentId) {
      Alert.alert("Student ID required", "Please enter your student id first.");
      setEditingStudentId(true);
      return;
    }
    try {
      setLoading(true);
      const res = await registerForEvent(eventId, studentId);
      console.log("registerForEvent:", res);
      Toast.show({ type: "success", text1: "Registered", text2: "You have registered." });
      await fetchRegistrations(studentId);
      await fetchAll(search, selectedType);
    } catch (err) {
      console.error("register error", err);
      const msg = err?.message || (err?.response?.data?.error) || "Registration failed";
      Toast.show({ type: "error", text1: "Registration failed", text2: String(msg) });
    } finally {
      setLoading(false);
    }
  };

  const openFeedback = (eventObj) => {
    setFeedbackEvent(eventObj);
    setFeedbackText("");
    setShowFeedbackModal(true);
  };

  const submitFeedbackHandler = async () => {
    if (!feedbackEvent) return;
    if (!studentId) {
      Alert.alert("Student ID required", "Save your student id to submit feedback.");
      return;
    }
    setSubmittingFeedback(true);
    try {
      await submitFeedback(feedbackEvent.event_id || feedbackEvent.id || feedbackEvent.eventId, studentId, 5, feedbackText);
      Toast.show({ type: "success", text1: "Feedback sent" });
      setShowFeedbackModal(false);
    } catch (err) {
      console.error("feedback error", err);
      Toast.show({ type: "error", text1: "Could not send feedback" });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const openQr = (eventObj) => {
    // QR payload: event id + student id
    setQrEventData({ eventId: eventObj.event_id || eventObj.id, studentId });
    setQrModalVisible(true);
  };

  const saveStudentId = async (id) => {
    const v = (id || "").trim();
    if (!v) return Alert.alert("Enter student id");
    await AsyncStorage.setItem("studentId", v);
    setStudentId(v);
    setEditingStudentId(false);
    await fetchRegistrations(v);
    Toast.show({ type: "success", text1: "Student id saved" });
  };

  const clearStudentId = async () => {
    await AsyncStorage.removeItem("studentId");
    setStudentId(null);
    setEditingStudentId(true);
    setRegistrations([]);
    Toast.show({ type: "success", text1: "Cleared student id" });
  };

  // render event card (mobile)
  const renderEvent = ({ item }) => {
    const id = item.event_id || item.id;
    const registered = registrations.some((r) => (r.event_id || r.eventId) === id || r.event_id === id);
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{item.type} • {item.starts_at ? new Date(item.starts_at).toLocaleString() : item.date}</Text>
        <Text numberOfLines={2} style={styles.desc}>{item.description}</Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, registered && styles.btnDisabled]}
            onPress={() => onRegister(id)}
            disabled={registered}
          >
            <Text style={styles.btnText}>{registered ? "Registered" : "Register"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => openQr(item)}>
            <Text style={styles.linkText}>Show QR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => openFeedback(item)}>
            <Text style={styles.linkText}>Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // featured slice
  const featured = (filtered || []).filter((e) => e.featured).slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <Toast position="top" />
      <Text style={styles.header}>Campus Events</Text>

      <View style={styles.controls}>
        <TextInput
          style={styles.search}
          placeholder="Search events..."
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.typeRow}>
          {EVENT_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, selectedType === t && styles.typeBtnActive]}
              onPress={() => setSelectedType(t)}
            >
              <Text style={[styles.typeText, selectedType === t && styles.typeTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.subheader}>Featured</Text>
      <FlatList
        data={featured}
        horizontal
        keyExtractor={(i) => (i.event_id || i.id || "").toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate("EventDetail", { event: item })}>
            <Text style={styles.featureTitle}>{item.title}</Text>
            <Text numberOfLines={2} style={styles.featureDesc}>{item.description}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No featured events</Text>}
      />

      <Text style={styles.subheader}>All events</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => (i.event_id || i.id || "").toString()}
          renderItem={renderEvent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<Text style={styles.empty}>No events found</Text>}
        />
      )}

      {/* QR Modal */}
      <Modal visible={qrModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBG}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Your QR Code</Text>
            {qrEventData ? (
              <View style={{ alignItems: "center", marginVertical: 12 }}>
                <QRCode value={JSON.stringify(qrEventData)} size={200} />
                <Text style={{ marginTop: 12 }}>Event: {qrEventData.eventId}</Text>
              </View>
            ) : (
              <ActivityIndicator />
            )}
            <TouchableOpacity style={styles.modalBtn} onPress={() => setQrModalVisible(false)}>
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal visible={showFeedbackModal} animationType="slide" transparent={true}>
        <View style={styles.modalBG}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Feedback for {feedbackEvent?.title}</Text>
            <TextInput
              style={[styles.feedbackInput]}
              placeholder="Write feedback..."
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <TouchableOpacity style={[styles.modalBtn, { flex: 1, marginRight: 8 }]} onPress={() => setShowFeedbackModal(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { flex: 1 }]}
                onPress={submitFeedbackHandler}
                disabled={submittingFeedback}
              >
                <Text style={styles.modalBtnText}>{submittingFeedback ? "Sending..." : "Send"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Student ID input overlay (simple) */}
      {editingStudentId && (
        <View style={{ position: "absolute", bottom: 20, left: 16, right: 16 }}>
          <View style={{ backgroundColor: "#fff", padding: 12, borderRadius: 10, elevation: 6 }}>
            <Text style={{ fontWeight: "600", marginBottom: 8 }}>Enter your student id</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                placeholder="e.g. r001"
                style={{ flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 6, padding: 8 }}
                value={studentId || ""}
                onChangeText={setStudentId}
              />
              <TouchableOpacity onPress={() => saveStudentId(studentId)} style={{ backgroundColor: "#007bff", padding: 10, borderRadius: 6 }}>
                <Text style={{ color: "#fff" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  controls: { marginBottom: 8 },
  search: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 8, marginBottom: 8 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "#ddd", marginRight: 8, marginBottom: 8 },
  typeBtnActive: { backgroundColor: "#007bff", borderColor: "#007bff" },
  typeText: { fontSize: 12 },
  typeTextActive: { color: "#fff" },

  subheader: { marginTop: 12, fontSize: 18, fontWeight: "600", marginBottom: 6 },
  featureCard: { backgroundColor: "#f7f7f7", padding: 12, borderRadius: 8, marginRight: 10, width: 240 },
  featureTitle: { fontWeight: "700", marginBottom: 6 },
  featureDesc: { fontSize: 13 },
  empty: { textAlign: "center", marginVertical: 12, color: "#666" },

  card: { borderWidth: 1, borderColor: "#eee", padding: 12, borderRadius: 8, backgroundColor: "#fff" },
  title: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 12, color: "#666", marginBottom: 6 },
  desc: { fontSize: 13, color: "#444", marginBottom: 8 },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  btn: { backgroundColor: "#007bff", padding: 8, borderRadius: 6, minWidth: 100, alignItems: "center" },
  btnDisabled: { backgroundColor: "#999" },
  btnText: { color: "#fff", fontWeight: "600" },
  linkBtn: { padding: 8 },
  linkText: { color: "#007bff" },

  modalBG: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  modalCard: { width: "90%", backgroundColor: "#fff", padding: 16, borderRadius: 10 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  modalBtn: { backgroundColor: "#007bff", borderRadius: 6, padding: 10, marginTop: 12, alignItems: "center" },
  modalBtnText: { color: "#fff", fontWeight: "600" },
  feedbackInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, minHeight: 100, padding: 8, marginBottom: 8 },
});
