import type { SessionUser } from "./types";

const TOKEN_KEY = "pos-movil:token";
const USER_KEY = "pos-movil:user";

type Listener = () => void;
const listeners = new Set<Listener>();

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Lee el `exp` del JWT sin validar la firma — de validar se encarga el CRM.
 * Acá alcanza para no mostrar la app entera con un token ya muerto.
 */
function readExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "=")), (c) =>
      c.charCodeAt(0)
    );
    const { exp } = JSON.parse(new TextDecoder().decode(bytes)) as { exp?: number };
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Milisegundos epoch en que vence la sesión, o null si no se puede saber. */
export function getSessionExpiry(): number | null {
  const token = getToken();
  return token ? readExpiry(token) : null;
}

export function isSessionExpired(): boolean {
  const expiry = getSessionExpiry();
  return expiry !== null && expiry <= Date.now();
}

export function getStoredUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  listeners.forEach((l) => l());
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  listeners.forEach((l) => l());
}

// Lets AuthProvider re-render when api.ts clears the session on a 401.
export function subscribeToSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
