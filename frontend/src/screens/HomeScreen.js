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

// Import your existing API client functions (adapt if needed)
import {
  getEvents,
  registerForEvent,
  getRegistrationsForStudent,
  submitFeedback,
} from "../services/api";

const EVENT_TYPES = ["All", "Workshop", "Seminar", "Drive", "Hackathon"];

export default function HomeScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  const [registrations, setRegistrations] = useState([]);
  const [studentId, setStudentId] = useState(null); // set from auth / storage
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackEvent, setFeedbackEvent] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // QR modal state
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrEventData, setQrEventData] = useState(null);

  // fetch events
  const fetchAll = async (q = "", type = "All") => {
    setLoading(true);
    try {
      // You can pass query params to backend if supported
      const res = await getEvents({ q, type: type === "All" ? undefined : type });
      setEvents(res.data || res);
      setFiltered(res.data || res);
    } catch (err) {
      console.error("getEvents error", err);
      Alert.alert("Error", "Could not load events.");
    } finally {
      setLoading(false);
    }
  };

  // fetch registrations for student
  const fetchRegistrations = async () => {
    try {
      if (!studentId) return;
      const res = await getRegistrationsForStudent(studentId);
      setRegistrations(res.data || res);
    } catch (err) {
      console.error("getRegistrations error", err);
    }
  };

  useEffect(() => {
    // get student id from auth / storage if you use JWT stored in AsyncStorage
    // for demo assume studentId is available; otherwise integrate with auth
    const init = async () => {
      // TODO: load studentId from auth context or async storage
      // setStudentId(await AsyncStorage.getItem('studentId'));
      setStudentId("student_123"); // placeholder
      await fetchAll();
      await fetchRegistrations();
    };
    init();
  }, []);

  // Debounced filter — uses lodash.debounce
  // Keep debounced reference stable
  const debouncedSearch = useRef(
    debounce((text, type) => {
      // Filter locally for responsiveness; optionally call backend
      const q = text.trim().toLowerCase();
      const filteredList = events.filter((ev) => {
        const matchesQ = q === "" || (ev.title || "").toLowerCase().includes(q) || (ev.description || "").toLowerCase().includes(q);
        const matchesType = type === "All" || ev.type === type;
        return matchesQ && matchesType;
      });
      setFiltered(filteredList);
    }, 350)
  ).current;

  // fire when search or type changes
  useEffect(() => {
    debouncedSearch(search, selectedType);
  }, [search, selectedType, events]);

  const onRegister = async (eventId) => {
    try {
      setLoading(true);
      await registerForEvent(eventId, studentId);
      Toast.show({ type: "success", text1: "Registered", text2: "You've registered successfully." });
      await fetchRegistrations();
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Registration failed" });
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
    setSubmittingFeedback(true);
    try {
      await submitFeedback(feedbackEvent.id, { studentId, text: feedbackText });
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
    // Prepare QR payload — can be just registration id or event id + student id
    setQrEventData({ eventId: eventObj.id, studentId });
    setQrModalVisible(true);
  };

  const renderEvent = ({ item }) => {
    const registered = registrations.some((r) => r.eventId === item.id);
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{item.type} • {item.date}</Text>
        <Text numberOfLines={2} style={styles.desc}>{item.description}</Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, registered && styles.btnDisabled]}
            onPress={() => onRegister(item.id)}
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

  const featured = filtered.filter((e) => e.featured).slice(0, 3);

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
        keyExtractor={(i) => i.id.toString()}
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
          keyExtractor={(i) => i.id.toString()}
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
                {/* QR payload: JSON string. On scanner decode and verify. */}
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
