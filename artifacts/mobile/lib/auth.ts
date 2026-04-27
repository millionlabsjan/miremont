import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/theme";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "buyer" | "agent" | "admin";
  avatarUrl?: string | null;
  agencyName?: string | null;
  preferredLanguage?: string | null;
  preferredCurrency?: string | null;
}

interface AuthState {
  user: User | null;
  sessionCookie: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<User>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: "buyer" | "agent",
    agencyName?: string
  ) => Promise<User>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionCookie: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Login failed");
    }

    const data = await res.json();
    const { sessionCookie, ...user } = data;

    set({ user, sessionCookie, isLoading: false });
    await AsyncStorage.setItem("user", JSON.stringify(user));
    if (sessionCookie) {
      await AsyncStorage.setItem("sessionCookie", sessionCookie);
    }
    return user;
  },

  signup: async (email, password, name, role, agencyName) => {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, role, agencyName }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Signup failed");
    }

    const data = await res.json();
    const { sessionCookie, ...user } = data;

    set({ user, sessionCookie, isLoading: false });
    await AsyncStorage.setItem("user", JSON.stringify(user));
    if (sessionCookie) {
      await AsyncStorage.setItem("sessionCookie", sessionCookie);
    }
    return user;
  },

  logout: async () => {
    const { sessionCookie } = get();
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: sessionCookie
          ? { "x-session-cookie": sessionCookie }
          : {},
      });
    } catch {}
    set({ user: null, sessionCookie: null, isLoading: false });
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("sessionCookie");
  },

  restore: async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      const storedCookie = await AsyncStorage.getItem("sessionCookie");

      if (storedUser && storedCookie) {
        const user = JSON.parse(storedUser);
        set({ user, sessionCookie: storedCookie, isLoading: false });

        // Verify session is still valid
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { "x-session-cookie": storedCookie },
        });
        if (res.ok) {
          const freshUser = await res.json();
          set({ user: freshUser });
        } else {
          set({ user: null, sessionCookie: null });
          await AsyncStorage.removeItem("user");
          await AsyncStorage.removeItem("sessionCookie");
        }
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
