/**
 * Espejo del cálculo de totales del CRM: `calcTagDiscount()` / `splitDiscount()` en
 * crm-polarizados/src/lib/discount-tag-calc.ts, y el POST de
 * src/app/api/mobile/v1/sales/route.ts que los combina.
 *
 * El backend sigue siendo la fuente de verdad del total — esto existe sólo para
 * poder mostrarlo ANTES de confirmar. Hasta que apareció, la pantalla de
 * facturación mostraba el subtotal pelado y el CRM registraba un 21% más: el
 * vendedor le cantaba un precio al taller y quedaba anotado otro.
 *
 * **Si el cálculo cambia del lado del CRM, tiene que cambiar acá.**
 *
 * El IVA ya no entra en la cuenta: el precio de lista YA lo incluye, así que
 * sumárselo aparte a la venta que pedía factura lo cobraba dos veces. El total
 * es el mismo lleve factura o no, y la factura se emite por ese mismo importe
 * (el CRM le avisa a quien factura al confirmarse la venta). Antes se sumaba el
 * 21% sobre la base neta de descuentos.
 */

/**
 * Cuánto descuenta la etiqueta del cliente sobre este subtotal.
 *
 * Acotado a `[0, subtotal]` igual que en el CRM: una etiqueta de monto fijo más
 * grande que la venta descuenta la venta entera y no deja el total en negativo.
 */
export function calcTagDiscount(
  tag: { type: string; value: number },
  subtotal: number
): number {
  const value = Number(tag.value);
  if (!Number.isFinite(value) || value <= 0 || subtotal <= 0) return 0;
  const raw = tag.type === "FIXED" ? value : subtotal * (value / 100);
  return Math.round(Math.min(Math.max(raw, 0), subtotal) * 100) / 100;
}

/** `"A — Mayorista (20%)"` — el mismo texto que guarda el CRM en la venta. */
export function describeTag(tag: { code: string; name: string; type: string; value: number }): string {
  const detail = tag.type === "FIXED" ? formatMoney(tag.value) : `${tag.value}%`;
  return `${tag.code} — ${tag.name} (${detail})`;
}

export type SaleTotals = {
  subtotal: number;
  /** Etiqueta + lo cargado a mano. Es lo que el CRM guarda en `Sale.discount`. */
  discount: number;
  tagDiscount: number;
  manualDiscount: number;
  tax: number;
  total: number;
};

/**
 * `discount` es lo que el vendedor tipeó; `tag` es la etiqueta del cliente (o
 * null). Los dos descuentos se **suman**: la etiqueta es el precio pactado de
 * base y lo tipeado es una concesión encima, igual que en el CRM. Si la suma se
 * pasa del subtotal se recorta la parte tipeada y la etiqueta queda intacta.
 */
export function calcSaleTotals(input: {
  subtotal: number;
  discount: number;
  requiresFactura: boolean;
  tag?: { type: string; value: number } | null;
}): SaleTotals {
  const tagDiscount = input.tag ? calcTagDiscount(input.tag, input.subtotal) : 0;
  const manualDiscount = Math.min(
    Math.max(input.discount, 0),
    Math.max(input.subtotal - tagDiscount, 0)
  );
  const discount = Math.round((tagDiscount + manualDiscount) * 100) / 100;
  // Sin IVA encima, igual que el backend: el precio ya lo incluye.
  // `requiresFactura` se sigue mandando —es lo que dispara el recordatorio de
  // facturación del CRM— pero no toca el total.
  return {
    subtotal: input.subtotal,
    discount,
    tagDiscount,
    manualDiscount,
    tax: 0,
    total: input.subtotal - discount,
  };
}

/** `$1.234` — el formato que ya usaban todas las pantallas. */
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("es-AR")}`;
}
