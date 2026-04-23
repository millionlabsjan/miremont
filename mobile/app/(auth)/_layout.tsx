import { Stack, Redirect } from "expo-router";
import { useAuthStore } from "../../lib/auth";

export default function AuthLayout() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) return null;
  if (user) return <Redirect href="/(tabs)" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
