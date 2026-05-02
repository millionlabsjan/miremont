import { useEffect, useRef } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { queryClient } from "../lib/queryClient";
import { useAuthStore } from "../lib/auth";
import { registerForPushAsync } from "../lib/push";
import { notificationRoute } from "../lib/notificationRoute";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";

export default function RootLayout() {
  const restore = useAuthStore((s) => s.restore);
  const userId = useAuthStore((s) => s.user?.id);
  const registeredFor = useRef<string | null>(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    restore();
  }, []);

  // Register push token whenever a user logs in (idempotent server-side).
  useEffect(() => {
    if (userId && registeredFor.current !== userId) {
      registeredFor.current = userId;
      registerForPushAsync().catch(() => {});
    }
    if (!userId) {
      registeredFor.current = null;
    }
  }, [userId]);

  // Deep-link to the right screen when the user taps a push.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { link?: string; type?: string }
        | undefined;
      const route = notificationRoute(data?.link);
      if (route) router.push(route as any);
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="property/[id]" options={{ presentation: "card" }} />
        <Stack.Screen name="chat/[id]" options={{ presentation: "card" }} />
        <Stack.Screen name="article/[slug]" options={{ presentation: "card" }} />
        <Stack.Screen name="admin/plan/[userId]" options={{ presentation: "card" }} />
      </Stack>
    </QueryClientProvider>
  );
}
