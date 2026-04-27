import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "buyer" | "agent" | "admin";
  avatarUrl?: string | null;
  agencyName?: string | null;
  preferredLanguage?: string | null;
  preferredCurrency?: string | null;
  status?: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
