import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "./api";
import {
  clearSession,
  getSessionExpiry,
  getStoredUser,
  getToken,
  isSessionExpired,
  subscribeToSession,
} from "./token-store";
import type { SessionUser } from "./types";

type AuthContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function currentUser(): SessionUser | null {
  if (!getToken() || isSessionExpired()) return null;
  return getStoredUser();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(currentUser);

  useEffect(() => subscribeToSession(() => setUser(currentUser())), []);

  // El token dura 8 h y la jornada de ruta también, así que la sesión se muere
  // en la última visita del día. Antes nadie miraba el `exp`: la app abría
  // normal, dejaba armar el carrito entero, y el 401 llegaba recién al tocar
  // "Confirmar venta" — delante del cliente y con el carrito puesto. Cerrarla
  // apenas vence, y al volver a primer plano (que es cuando el vendedor saca el
  // teléfono del bolsillo), hace que el corte pase antes de empezar y no al
  // final. El borrador de la venta sobrevive al logout, así que después de
  // volver a entrar el carrito sigue ahí.
  useEffect(() => {
    function dropIfExpired() {
      if (getToken() && isSessionExpired()) clearSession();
    }

    dropIfExpired();
    document.addEventListener("visibilitychange", dropIfExpired);

    const expiry = getSessionExpiry();
    // setTimeout desborda pasados ~24 días; el TTL es de 8 h, pero el clamp
    // evita que un `exp` raro lo dispare al instante.
    const timer =
      expiry === null
        ? undefined
        : window.setTimeout(dropIfExpired, Math.min(Math.max(expiry - Date.now(), 0), 2 ** 31 - 1));

    return () => {
      document.removeEventListener("visibilitychange", dropIfExpired);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [user]);

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
