// mobile/App.js
import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { API_URL } from "./src/config";

/* ===== THEME ===== */
const c = {
  bg: "#0B0F14",
  card: "#121820",
  text: "#E8EEF5",
  sub: "#B2C0CF",
  accent: "#6EE7F2",
  border: "#2A3748",
};

const Container = ({ children }) => (
  <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      {children}
    </KeyboardAvoidingView>
  </SafeAreaView>
);

const Card = ({ children }) => (
  <View
    style={{
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginHorizontal: 16,
      marginTop: 16,
    }}
  >
    {children}
  </View>
);

const H1 = ({ children }) => (
  <Text style={{ fontSize: 26, fontWeight: "800", color: c.text }}>{children}</Text>
);
const P = ({ children }) => <Text style={{ color: c.sub, marginTop: 6 }}>{children}</Text>;

const Button = ({ title, onPress, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={{
      backgroundColor: disabled ? "#223040" : c.accent,
      padding: 14,
      borderRadius: 12,
      marginTop: 14,
    }}
  >
    <Text
      style={{
        color: disabled ? "#8BA0B5" : "#001016",
        textAlign: "center",
        fontWeight: "700",
      }}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

const Input = (props) => (
  <TextInput
    {...props}
    placeholderTextColor="#7C8DA2"
    style={{
      backgroundColor: "#0E141B",
      borderColor: c.border,
      borderWidth: 1,
      color: c.text,
      padding: 12,
      borderRadius: 12,
      marginTop: 12,
    }}
  />
);

/* ===== CHAT UI ===== */
const Bubble = ({ role, text }) => {
  const isUser = role === "user";
  return (
    <View
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "80%",
        backgroundColor: isUser ? c.accent : c.card,
        borderColor: isUser ? "transparent" : c.border,
        borderWidth: isUser ? 0 : 1,
        padding: 12,
        borderRadius: 14,
        marginVertical: 6,
      }}
    >
      <Text style={{ color: isUser ? "#001016" : c.text }}>{text}</Text>
    </View>
  );
};

const ChatInput = ({ value, onChangeText, onSend, disabled }) => (
  <View
    style={{
      flexDirection: "row",
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.bg,
    }}
  >
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Describe the situation…"
      placeholderTextColor="#7C8DA2"
      style={{
        flex: 1,
        backgroundColor: "#0E141B",
        borderColor: c.border,
        borderWidth: 1,
        color: c.text,
        padding: 12,
        borderRadius: 12,
        marginRight: 8,
      }}
      multiline
    />
    <TouchableOpacity
      onPress={onSend}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? "#223040" : c.accent,
        paddingHorizontal: 16,
        justifyContent: "center",
        borderRadius: 12,
      }}
    >
      <Text style={{ color: disabled ? "#8BA0B5" : "#001016", fontWeight: "700" }}>
        Send
      </Text>
    </TouchableOpacity>
  </View>
);

/* ===== APP ===== */
export default function App() {
  // Steps: 0 Name, 1 Age, 2 Gender, 3 Chat
  const [step, setStep] = useState(0);

  // Profile
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState(""); // "Male" | "Female"

  // Chat
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! Tell me the situation and I’ll craft a short, natural excuse." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const readyName = name.trim().length > 0;
  const readyAge = /^\d+$/.test(age) && Number(age) > 0 && Number(age) < 120;
  const readyGender = gender === "Male" || gender === "Female";

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    const scenario = input.trim();
    if (!scenario) return;

    setMessages((m) => [...m, { role: "user", text: scenario }]);
    setInput("");
    setSending(true);

    try {
      // No tone/audience; let backend infer from text + profile
      const resp = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          age: Number(age),
          scenario,           // raw user text
          gender,             // used for persona
          // audience: null, tone: null  (omitted → inferred on server)
          constraints: { no_medical: true, chat: true },
          variants: 1,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Failed to generate");

      const text = data?.options?.[0]?.text || "Sorry, I couldn’t craft that one.";
      setMessages((m) => [...m, { role: "assistant", text }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Hmm, that didn’t go through. Try rephrasing." },
      ]);
    } finally {
      setSending(false);
    }
  };

  /* ===== Onboarding ===== */
  if (step <= 2) {
    return (
      <Container>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <H1>Excuse Engine</H1>
          <P>Quick onboarding, then chat.</P>

          {step === 0 && (
            <Card>
              <Text style={{ color: c.text, fontWeight: "700" }}>Your name</Text>
              <Input
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <Button title="Next → Age" onPress={() => setStep(1)} disabled={!name.trim()} />
            </Card>
          )}

          {step === 1 && (
            <Card>
              <Text style={{ color: c.text, fontWeight: "700" }}>Your age</Text>
              <Input
                placeholder="Enter your age"
                keyboardType="number-pad"
                value={age}
                onChangeText={setAge}
                maxLength={3}
              />
              <View style={{ flexDirection: "row", marginTop: 10 }}>
                <Button title="Back" onPress={() => setStep(0)} />
                <View style={{ width: 10 }} />
                <Button title="Next → Gender" onPress={() => setStep(2)} disabled={!readyAge} />
              </View>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <Text style={{ color: c.text, fontWeight: "700" }}>Select your gender</Text>
              <View style={{ flexDirection: "row", marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => setGender("Male")}
                  style={{
                    flex: 1,
                    backgroundColor: gender === "Male" ? "#253246" : "#1A2230",
                    borderWidth: gender === "Male" ? 1.5 : 1,
                    borderColor: gender === "Male" ? c.accent : c.border,
                    borderRadius: 16,
                    padding: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>👨</Text>
                  <Text style={{ color: c.text, marginTop: 8, fontWeight: "700" }}>Male</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setGender("Female")}
                  style={{
                    flex: 1,
                    backgroundColor: gender === "Female" ? "#253246" : "#1A2230",
                    borderWidth: gender === "Female" ? 1.5 : 1,
                    borderColor: gender === "Female" ? c.accent : c.border,
                    borderRadius: 16,
                    padding: 18,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 28 }}>👩</Text>
                  <Text style={{ color: c.text, marginTop: 8, fontWeight: "700" }}>Female</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: "row", marginTop: 14 }}>
                <Button title="Back" onPress={() => setStep(1)} />
                <View style={{ width: 10 }} />
                <Button title="Start Chat" onPress={() => setStep(3)} disabled={!readyGender} />
              </View>
            </Card>
          )}
        </ScrollView>
      </Container>
    );
  }

  /* ===== Chat ===== */
  return (
    <Container>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <H1>Chat</H1>
        <P>Hi {name.split(" ")[0] || "there"} — tell me the situation.</P>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} text={m.text} />
        ))}
        {sending && (
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", marginVertical: 6 }}>
            <ActivityIndicator />
            <Text style={{ color: c.sub, marginLeft: 8 }}>Thinking…</Text>
          </View>
        )}
      </ScrollView>

      <ChatInput
        value={input}
        onChangeText={setInput}
        onSend={sendMessage}
        disabled={sending || input.trim().length === 0}
      />
    </Container>
  );
}
