import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { colors } from "../../constants/theme";
import { apiRequest } from "../../lib/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendReset = async () => {
    setError("");
    setLoading(true);
    try {
      await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    } catch {
      // silently ignore resend errors
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.offwhite }}>
      {/* Header bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ position: "absolute", left: 16, zIndex: 1 }}
        >
          <Text style={{ fontSize: 20, color: colors.dark }}>←</Text>
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontFamily: "Inter_600SemiBold",
            fontSize: 16,
            color: colors.dark,
            textAlign: "center",
          }}
        >
          Reset password
        </Text>
      </View>

      <View style={{ padding: 24, paddingTop: 32 }}>
        {/* Mail icon */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: colors.dark,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 28 }}>✉️</Text>
            </View>
            {sent && (
              <View
                style={{
                  position: "absolute",
                  bottom: -6,
                  right: -6,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.offwhite,
                  borderWidth: 2,
                  borderColor: colors.dark,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 12, color: colors.dark }}>✓</Text>
              </View>
            )}
          </View>
        </View>

        {!sent ? (
          <>
            <Text
              style={{
                fontFamily: "PlayfairDisplay_700Bold",
                fontSize: 28,
                color: colors.dark,
                marginBottom: 8,
              }}
            >
              Forgot your password?
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 15,
                color: colors.warm,
                lineHeight: 22,
                marginBottom: 28,
              }}
            >
              Enter the email address linked to your account and we'll send you
              a secure reset link.
            </Text>

            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 11,
                color: colors.warm,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Email address
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={colors.warm}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                height: 52,
                backgroundColor: colors.input,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 16,
                fontFamily: "Inter_400Regular",
                fontSize: 15,
                color: colors.dark,
                marginBottom: 20,
              }}
            />

            {error ? (
              <View
                style={{
                  backgroundColor: "#fef2f2",
                  borderWidth: 1,
                  borderColor: "#fecaca",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    color: "#dc2626",
                  }}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSendReset}
              disabled={loading || !email}
              style={{
                height: 52,
                backgroundColor: colors.dark,
                borderRadius: 10,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
                opacity: loading || !email ? 0.5 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.offwhite} />
              ) : (
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                    color: colors.offwhite,
                  }}
                >
                  Send reset link
                </Text>
              )}
            </TouchableOpacity>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  color: colors.warm,
                }}
              >
                Remember your password?{" "}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/login")}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: colors.dark,
                  }}
                >
                  Log in
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text
              style={{
                fontFamily: "PlayfairDisplay_700Bold",
                fontSize: 28,
                color: colors.dark,
                marginBottom: 8,
              }}
            >
              Check your inbox
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 15,
                color: colors.warm,
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              We've sent a password reset link to your email. If it doesn't
              arrive, check your spam folder.
            </Text>

            {/* Email badge */}
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <View
                style={{
                  backgroundColor: colors.input,
                  borderRadius: 20,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    color: colors.dark,
                  }}
                >
                  {email}
                </Text>
              </View>
            </View>

            {/* Resend email button */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={loading}
              style={{
                height: 52,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 20,
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.dark} />
              ) : (
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                    color: colors.dark,
                  }}
                >
                  Resend email
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
              style={{ alignSelf: "center", marginBottom: 24 }}
            >
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  color: colors.dark,
                }}
              >
                ← Back to log in
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: colors.warm,
                textAlign: "center",
              }}
            >
              The reset link expires in 30 minutes.
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
