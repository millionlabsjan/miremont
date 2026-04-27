import { useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import { apiRequest } from "../lib/queryClient";

export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    if (user) return;
    setLoading(true);
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setUser(data);
    return data;
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: "buyer" | "agent",
    agencyName?: string
  ) => {
    const res = await apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role, agencyName }),
    });
    const data = await res.json();
    setUser(data);
    return data;
  };

  const logout = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return { user, isLoading, login, signup, logout };
}
