"use client";

import "@ant-design/v5-patch-for-react-19";
import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";
import { normalizeUsersMeResponse } from "@/lib/strapi-normalize-me";
import { roleForCookie } from "@/lib/role-for-cookie";

const AuthContext = createContext<any>(null);

/** Keeps middleware cookie in sync with localStorage (middleware only reads cookies, not localStorage). */
async function syncSessionCookie(token: string, roleName: string) {
  try {
    const res = await fetch("/api/auth/set-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, role: roleName || null }),
    });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as { success?: boolean }) : {};
    if (!res.ok || !data?.success) {
      console.warn("[auth] set-cookie failed; protected routes may redirect until next login.");
    }
  } catch (e) {
    console.warn("[auth] set-cookie request failed:", e);
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get(
          "/users/me?populate[role]=true&populate[profile]=true",
        );
        const { user, role } = normalizeUsersMeResponse(res.data);
        if (!user) {
          localStorage.removeItem("token");
          localStorage.removeItem("tokenExpiration");
          setUser(null);
        } else {
          setUser(user);
          await syncSessionCookie(token, roleForCookie(role));
        }
      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("tokenExpiration");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  /** Avoid null destructure if a component renders outside AuthProvider (should not happen). */
  if (ctx == null) {
    return {
      user: null,
      setUser: () => {},
      loading: false,
    };
  }
  return ctx;
};
