import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "../../constants/theme";
import { apiRequest } from "../../lib/api";
import { validatePassword, PASSWORD_RULES_HINT } from "../../lib/password";

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
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
          onPress={() => router.push("/(auth)/login")}
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
          New password
        </Text>
      </View>

      <View style={{ padding: 24, paddingTop: 32 }}>
        {/* Lock icon */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
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
            <Text style={{ fontSize: 28 }}>🔒</Text>
          </View>
        </View>

        {success ? (
          <>
            <Text
              style={{
                fontFamily: "PlayfairDisplay_700Bold",
                fontSize: 28,
                color: colors.dark,
                marginBottom: 8,
              }}
            >
              Password updated
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 15,
                color: colors.warm,
                lineHeight: 22,
                marginBottom: 32,
              }}
            >
              Your password has been reset successfully. You can now log in with
              your new password.
            </Text>

            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              style={{
                height: 52,
                backgroundColor: colors.dark,
                borderRadius: 10,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                  color: colors.offwhite,
                }}
              >
                Back to log in
              </Text>
            </TouchableOpacity>
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
              Set a new password
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
              Choose a new password for your account. It must be at least 8
              characters.
            </Text>

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
              New password
            </Text>
            <View style={{ marginBottom: 16 }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={PASSWORD_RULES_HINT}
                placeholderTextColor={colors.warm}
                secureTextEntry={!showPassword}
                style={{
                  height: 52,
                  backgroundColor: colors.input,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 16,
                  paddingRight: 48,
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  color: colors.dark,
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 16, top: 16 }}
              >
                <Text style={{ color: colors.warm, fontSize: 13 }}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

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
              Confirm password
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={colors.warm}
              secureTextEntry={!showPassword}
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
                marginBottom: 24,
              }}
            />

            <TouchableOpacity
              onPress={handleReset}
              disabled={loading || !password || !confirmPassword}
              style={{
                height: 52,
                backgroundColor: colors.dark,
                borderRadius: 10,
                justifyContent: "center",
                alignItems: "center",
                opacity: loading || !password || !confirmPassword ? 0.5 : 1,
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
                  Reset password
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
