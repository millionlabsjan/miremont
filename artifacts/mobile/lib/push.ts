import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { apiRequest } from "./api";

let cachedToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushAsync(): Promise<string | null> {
  if (!Device.isDevice) return null; // Simulator/emulator can't get a real Expo push token

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#1c1c1c",
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants as any).easConfig?.projectId;

  let token: string;
  try {
    const res = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    token = res.data;
  } catch (err) {
    console.warn("Failed to obtain Expo push token:", err);
    return null;
  }

  cachedToken = token;

  try {
    await apiRequest("/api/users/push-token", {
      method: "POST",
      body: JSON.stringify({
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
      }),
    });
  } catch (err) {
    console.warn("Failed to register push token with backend:", err);
  }

  return token;
}

export async function unregisterPushAsync(): Promise<void> {
  if (!cachedToken) return;
  try {
    await apiRequest("/api/users/push-token", {
      method: "DELETE",
      body: JSON.stringify({ token: cachedToken }),
    });
  } catch {
    // Best effort — server-side prune handles stragglers
  }
  cachedToken = null;
}
