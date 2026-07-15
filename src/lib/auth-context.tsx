import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "./api";
import { clearSession, getStoredUser, getToken, subscribeToSession } from "./token-store";
import type { SessionUser } from "./types";

type AuthContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() =>
    getToken() ? getStoredUser() : null
  );

  useEffect(() => subscribeToSession(() => setUser(getToken() ? getStoredUser() : null)), []);

  async function login(email: string, password: string) {
    const loggedInUser = await api.login(email, password);
    setUser(loggedInUser);
  }

  function logout() {
    clearSession();
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
