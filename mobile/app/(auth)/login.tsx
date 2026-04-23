import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuthStore } from "../../lib/auth";
import { colors } from "../../constants/theme";

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.offwhite }}
    >
      <ScrollView bounces={false}>
        {/* Hero Image */}
        <View style={{ height: 280, overflow: "hidden" }}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
            }}
            style={{ width: "100%", height: "100%", opacity: 0.7 }}
          />
          <View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(28,28,28,0.4)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "PlayfairDisplay_700Bold",
                fontSize: 28,
                color: colors.offwhite,
                textAlign: "center",
              }}
            >
              THE{"\n"}PROPERTY{"\n"}CATALOGUE
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: colors.warm,
                marginTop: 8,
              }}
            >
              The world's finest luxury properties.
            </Text>
          </View>
        </View>

        {/* Tab toggle */}
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View
            style={{
              flex: 1,
              paddingVertical: 16,
              borderBottomWidth: 2,
              borderBottomColor: colors.dark,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                textAlign: "center",
                color: colors.dark,
              }}
            >
              Log in
            </Text>
          </View>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 16 }}
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 15,
                textAlign: "center",
                color: colors.warm,
              }}
            >
              Sign up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={{ padding: 24 }}>
          <Text
            style={{
              fontFamily: "PlayfairDisplay_700Bold",
              fontSize: 28,
              color: colors.dark,
              marginBottom: 8,
            }}
          >
            Welcome back
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 15,
              color: colors.warm,
              marginBottom: 24,
            }}
          >
            Sign in to continue.
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
              marginBottom: 16,
            }}
          />

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
            Password
          </Text>
          <View style={{ marginBottom: 8 }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
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

          <TouchableOpacity
            style={{ alignSelf: "flex-end", marginBottom: 20 }}
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 13,
                color: colors.warm,
              }}
            >
              Forgot your password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              height: 52,
              backgroundColor: colors.dark,
              borderRadius: 10,
              justifyContent: "center",
              alignItems: "center",
              opacity: loading ? 0.5 : 1,
              marginBottom: 20,
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
                Log in
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View
              style={{ flex: 1, height: 1, backgroundColor: colors.border }}
            />
            <Text
              style={{
                marginHorizontal: 16,
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: colors.warm,
              }}
            >
              or
            </Text>
            <View
              style={{ flex: 1, height: 1, backgroundColor: colors.border }}
            />
          </View>

          <TouchableOpacity
            style={{
              height: 52,
              backgroundColor: colors.offwhite,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: colors.dark,
              }}
            >
              Continue with Google
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 32 }}>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: colors.warm,
              }}
            >
              Don't have an account?{" "}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: colors.dark,
                  }}
                >
                  Sign up
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Quick test login buttons */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20 }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, textAlign: "center" }}>
              Quick test login
            </Text>
            <View style={{ gap: 8 }}>
              {[
                { label: "👤 Buyer — Sophia Chen", email: "sophia@example.com", password: "buyer123" },
                { label: "🏢 Agent — Emma Rodriguez", email: "emma@luxuryrealty.com", password: "agent123" },
                { label: "🔑 Admin — Miremont Admin", email: "admin@thepropertycatalogue.com", password: "admin123" },
              ].map((account) => (
                <TouchableOpacity
                  key={account.email}
                  onPress={async () => {
                    setError("");
                    setLoading(true);
                    try {
                      await login(account.email, account.password);
                      router.replace("/(tabs)");
                    } catch (err: any) {
                      setError(err.message || "Login failed");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{
                    height: 44,
                    backgroundColor: colors.input,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.dark }}>
                    {account.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
