export const colors = {
  dark: "#1c1c1c",
  offwhite: "#fafafa",
  warm: "#b8ada4",
  border: "#d6d1cb",
  input: "#f4f1ee",
  accent: "#c9a96e",
  white: "#ffffff",
  green: "#16a34a",
  red: "#dc2626",
};

import { Platform } from "react-native";

const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL;
const explicitWsUrl = process.env.EXPO_PUBLIC_WS_URL;
const domain = process.env.EXPO_PUBLIC_DOMAIN;
const localHost = process.env.EXPO_PUBLIC_LOCAL_API_HOST || "localhost";
const localPort = process.env.EXPO_PUBLIC_LOCAL_API_PORT || "3000";

function resolveApiUrl(): string {
  if (explicitApiUrl) return explicitApiUrl;
  // On web (Expo dev preview / static export), use a same-origin relative path
  // so the request goes through Metro's /api proxy to the web API server.
  // This avoids cross-origin / CORS / cookie issues entirely.
  if (Platform.OS === "web") return "";
  if (domain) return `https://${domain}`;
  return `http://${localHost}:${localPort}`;
}

function resolveWsUrl(): string {
  if (explicitWsUrl) return explicitWsUrl;
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location) {
      const wsProto = window.location.protocol === "https:" ? "wss" : "ws";
      return `${wsProto}://${window.location.host}/ws`;
    }
    return "/ws";
  }
  // Derive from API URL if explicitly set (keeps host/port in sync)
  if (explicitApiUrl) {
    return explicitApiUrl.replace(/^http/, "ws") + "/ws";
  }
  if (domain) return `wss://${domain}/ws`;
  return `ws://${localHost}:${localPort}/ws`;
}

export const API_URL = resolveApiUrl();
export const WS_URL = resolveWsUrl();
