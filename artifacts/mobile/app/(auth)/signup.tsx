import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Image, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuthStore } from "../../lib/auth";
import { colors } from "../../constants/theme";
import { validatePassword, PASSWORD_RULES_HINT } from "../../lib/password";

export default function SignupScreen() {
  const signup = useAuthStore((s) => s.signup);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "buyer" as "buyer" | "agent", agencyName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");
    const pwError = validatePassword(form.password);
    if (pwError) {
      setError(pwError);
      return;
    }
    setLoading(true);
    try {
      await signup(form.email, form.password, form.name, form.role, form.role === "agent" ? form.agencyName : undefined);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.offwhite }}>
      <ScrollView bounces={false}>
        <View style={{ height: 240, overflow: "hidden" }}>
          <Image source={{ uri: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80" }} style={{ width: "100%", height: "100%", opacity: 0.7 }} />
          <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(28,28,28,0.4)", justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, color: colors.offwhite, textAlign: "center" }}>THE{"\n"}PROPERTY{"\n"}CATALOGUE</Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm, marginTop: 8 }}>The world's finest luxury properties.</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TouchableOpacity style={{ flex: 1, paddingVertical: 16 }} onPress={() => router.push("/(auth)/login")}>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 15, textAlign: "center", color: colors.warm }}>Log in</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, paddingVertical: 16, borderBottomWidth: 2, borderBottomColor: colors.dark }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, textAlign: "center", color: colors.dark }}>Sign up</Text>
          </View>
        </View>

        <View style={{ padding: 24 }}>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, color: colors.dark, marginBottom: 8 }}>Create account</Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: colors.warm, marginBottom: 24 }}>Join to discover luxury properties.</Text>

          {error ? <View style={{ backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 10, padding: 12, marginBottom: 16 }}><Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#dc2626" }}>{error}</Text></View> : null}

          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Full name</Text>
          <TextInput value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Emma Rodriguez" placeholderTextColor={colors.warm} style={{ height: 52, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 16, fontFamily: "Inter_400Regular", fontSize: 15, color: colors.dark, marginBottom: 16 }} />

          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Email address</Text>
          <TextInput value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="your@email.com" placeholderTextColor={colors.warm} keyboardType="email-address" autoCapitalize="none" style={{ height: 52, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 16, fontFamily: "Inter_400Regular", fontSize: 15, color: colors.dark, marginBottom: 16 }} />

          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Password</Text>
          <TextInput value={form.password} onChangeText={(v) => setForm((f) => ({ ...f, password: v }))} placeholder={PASSWORD_RULES_HINT} placeholderTextColor={colors.warm} secureTextEntry style={{ height: 52, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 16, fontFamily: "Inter_400Regular", fontSize: 15, color: colors.dark, marginBottom: 16 }} />

          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>I am a</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
            {(["buyer", "agent"] as const).map((role) => (
              <TouchableOpacity key={role} onPress={() => setForm((f) => ({ ...f, role }))} style={{ flex: 1, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: form.role === role ? colors.dark : colors.offwhite, borderWidth: 1, borderColor: form.role === role ? colors.dark : colors.border }}>
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: form.role === role ? colors.offwhite : colors.warm }}>{role === "buyer" ? "Property buyer" : "Estate agent"}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={handleSignup} disabled={loading} style={{ height: 52, backgroundColor: colors.dark, borderRadius: 10, justifyContent: "center", alignItems: "center", opacity: loading ? 0.5 : 1, marginBottom: 16 }}>
            {loading ? <ActivityIndicator color={colors.offwhite} /> : <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.offwhite }}>Create account</Text>}
          </TouchableOpacity>

          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, textAlign: "center", marginBottom: 24 }}>By creating an account you agree to our Terms of Service and Privacy Policy.</Text>

          <View style={{ flexDirection: "row", justifyContent: "center" }}>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild><TouchableOpacity><Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.dark }}>Log in</Text></TouchableOpacity></Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
