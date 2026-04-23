import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { colors } from "../../constants/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.offwhite, padding: 24, paddingTop: 80 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 32 }}>
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 15, color: colors.dark }}>← Back</Text>
      </TouchableOpacity>

      {!sent ? (
        <>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, color: colors.dark, marginBottom: 8 }}>Reset password</Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: colors.warm, marginBottom: 32 }}>Enter your email and we'll send you a reset link.</Text>

          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Email address</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor={colors.warm} keyboardType="email-address" autoCapitalize="none" style={{ height: 52, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 16, fontFamily: "Inter_400Regular", fontSize: 15, color: colors.dark, marginBottom: 24 }} />

          <TouchableOpacity onPress={() => setSent(true)} style={{ height: 52, backgroundColor: colors.dark, borderRadius: 10, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.offwhite }}>Send reset link</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <Text style={{ fontSize: 48, marginBottom: 24 }}>📧</Text>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, color: colors.dark, marginBottom: 8 }}>Check your inbox</Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: colors.warm, textAlign: "center", marginBottom: 24 }}>We've sent a password reset link to your email. If it doesn't arrive, check your spam folder.</Text>
          <View style={{ backgroundColor: colors.input, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 24 }}>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>{email}</Text>
          </View>
          <TouchableOpacity style={{ height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, marginBottom: 16 }}>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>Resend email</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>← Back to log in</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, marginTop: 24 }}>The reset link expires in 30 minutes.</Text>
        </View>
      )}
    </View>
  );
}
