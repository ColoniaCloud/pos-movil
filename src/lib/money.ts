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
 *
 * ─── Octubre 2026: la etiqueta se aplica POR LÍNEA ──────────────────────────
 *
 * Antes había una etiqueta por cliente que se aplicaba al subtotal entero. Ahora
 * cada línea lleva la suya, porque el caso real no se podía expresar: a un
 * revendedor se le pactó 16,66% en una lámina y nada en las otras dos de la
 * misma venta.
 *
 * **El POS no decide qué etiqueta va en cada línea, y no debe intentarlo.** La
 * precedencia tiene una regla que no es obvia (un contacto con acuerdos por
 * producto deja de usar su etiqueta general para todo) y vive en el CRM. Acá
 * cada producto llega con su `discountTag` ya resuelta desde
 * `GET /products?contactId=`, y esto solo la aplica.
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

/** Una línea del carrito con la etiqueta que le corresponde, ya resuelta. */
export type LineaConEtiqueta = {
  /** Total BRUTO de la línea: precio × cantidad. */
  total: number;
  /** La etiqueta de esta línea tal como la mandó el CRM, o null. */
  tag?: { code: string; name: string; type: string; value: number; active?: boolean } | null;
};

/**
 * Cuánto descuenta una línea. Espejo de `calcItemTagDiscount` del CRM.
 *
 * Una etiqueta desactivada no descuenta: el CRM ya filtra las inactivas antes de
 * mandarlas, pero el chequeo queda porque el `active` viaja en el payload y no
 * costaría nada olvidarse de él del otro lado.
 */
export function calcItemTagDiscount(linea: LineaConEtiqueta): number {
  const tag = linea.tag;
  if (!tag || tag.active === false) return 0;
  return calcTagDiscount(tag, linea.total);
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
 * `discount` es lo que el vendedor tipeó; `lines` son las líneas del carrito con
 * la etiqueta que el CRM le asignó a cada una. Los dos descuentos se **suman**:
 * la etiqueta es el precio pactado de base y lo tipeado es una concesión encima,
 * igual que en el CRM. Si la suma se pasa del subtotal se recorta la parte
 * tipeada y la etiqueta queda intacta.
 *
 * El descuento de etiquetas es la **suma de las líneas**, no un porcentaje sobre
 * el subtotal. Sin prorrateo: cada línea calcula el suyo contra su propio total,
 * así que no hay restos de redondeo que repartir y el desglose que ve el vendedor
 * suma exactamente el total que el CRM va a registrar.
 */
export function calcSaleTotals(input: {
  lines: LineaConEtiqueta[];
  discount: number;
  requiresFactura: boolean;
}): SaleTotals {
  const subtotal = round2(input.lines.reduce((suma, l) => suma + l.total, 0));
  const tagDiscount = round2(
    input.lines.reduce((suma, l) => suma + calcItemTagDiscount(l), 0)
  );
  const manualDiscount = Math.min(
    Math.max(input.discount, 0),
    Math.max(subtotal - tagDiscount, 0)
  );
  const discount = round2(tagDiscount + manualDiscount);
  // Sin IVA encima, igual que el backend: el precio ya lo incluye.
  // `requiresFactura` se sigue mandando —es lo que dispara el recordatorio de
  // facturación del CRM— pero no toca el total.
  return {
    subtotal,
    discount,
    tagDiscount,
    manualDiscount,
    tax: 0,
    total: round2(subtotal - discount),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** `$1.234` — el formato que ya usaban todas las pantallas. */
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("es-AR")}`;
}
