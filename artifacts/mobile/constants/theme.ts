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

const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL;
const explicitWsUrl = process.env.EXPO_PUBLIC_WS_URL;
const domain = process.env.EXPO_PUBLIC_DOMAIN;
const localHost = process.env.EXPO_PUBLIC_LOCAL_API_HOST || "localhost";
const localPort = process.env.EXPO_PUBLIC_LOCAL_API_PORT || "3000";

function resolveApiUrl(): string {
  if (explicitApiUrl) return explicitApiUrl;
  if (domain) return `https://${domain}`;
  return `http://${localHost}:${localPort}`;
}

function resolveWsUrl(): string {
  if (explicitWsUrl) return explicitWsUrl;
  if (domain) return `wss://${domain}/ws`;
  return `ws://${localHost}:${localPort}/ws`;
}

export const API_URL = resolveApiUrl();
export const WS_URL = resolveWsUrl();
