import type { CartItem, Client } from "./types";

/**
 * Guarda la venta a medio armar. En la ruta el teléfono se pasa el día en el
 * bolsillo: el sistema operativo mata la pestaña en segundo plano y, sin esto,
 * el vendedor rearmaba el pedido entero delante del cliente. Lo mismo pasaba al
 * vencer el token (dura 8 h, justo una jornada) o con un refresh accidental.
 *
 * Guarda el borrador, no la venta: la venta se registra sólo cuando el CRM la
 * confirma. Si no hay `localStorage` —modo privado, cuota llena— todo sigue
 * funcionando en memoria, como antes.
 */

const DRAFT_KEY = "pos-movil:sale-draft";

/**
 * Una jornada de ruta. Pasado eso el carrito se descarta en vez de restaurarse:
 * lleva los precios cacheados del momento en que se armó, y el backend registra
 * la venta con el `unitPrice` que le mandamos (ver M-6 en POS-MOVIL.md).
 * Restaurar un carrito de la semana pasada sería vender a precios viejos.
 */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type SaleDraft = { client: Client | null; cart: CartItem[] };

type StoredDraft = SaleDraft & { savedAt: number };

export function loadDraft(): SaleDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const stored = JSON.parse(raw) as Partial<StoredDraft>;
    const savedAt = typeof stored.savedAt === "number" ? stored.savedAt : 0;
    if (Date.now() - savedAt > MAX_AGE_MS) {
      clearDraft();
      return null;
    }

    const cart = Array.isArray(stored.cart) ? stored.cart : [];
    const client = stored.client ?? null;
    if (!client && cart.length === 0) return null;

    return { client, cart };
  } catch {
    // JSON corrupto o storage inaccesible: arrancamos de cero, que es el
    // comportamiento que había antes de que esto existiera.
    return null;
  }
}

export function saveDraft(draft: SaleDraft): void {
  if (!draft.client && draft.cart.length === 0) {
    clearDraft();
    return;
  }
  try {
    const stored: StoredDraft = { ...draft, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(stored));
  } catch {
    // Sin storage se pierde el borrador, no la venta.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ver saveDraft.
  }
}
