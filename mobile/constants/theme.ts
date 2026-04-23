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

export const API_URL = __DEV__
  ? "http://192.168.1.140:3001"
  : "https://your-production-url.com";

export const WS_URL = __DEV__
  ? "ws://192.168.1.140:3001/ws"
  : "wss://your-production-url.com/ws";
