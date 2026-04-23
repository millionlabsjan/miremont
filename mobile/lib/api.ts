import { API_URL } from "../constants/theme";
import { useAuthStore } from "./auth";

export async function apiRequest(
  path: string,
  options?: RequestInit
): Promise<any> {
  const { sessionCookie } = useAuthStore.getState();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  // React Native strips Cookie headers, so we use a custom header
  // that the server middleware copies into Cookie before session parsing
  if (sessionCookie) {
    headers["x-session-cookie"] = sessionCookie;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || res.statusText);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
