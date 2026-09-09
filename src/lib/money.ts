/**
 * Espejo del cálculo de totales del CRM: `calcTax()` en
 * crm-polarizados/src/lib/utils.ts y las líneas 89-90 de
 * src/app/api/mobile/v1/sales/route.ts.
 *
 * El backend sigue siendo la fuente de verdad del total — esto existe sólo para
 * poder mostrarlo ANTES de confirmar. Hasta que apareció, la pantalla de
 * facturación mostraba el subtotal pelado y el CRM registraba un 21% más: el
 * vendedor le cantaba un precio al taller y quedaba anotado otro.
 *
 * **Si el cálculo cambia del lado del CRM, tiene que cambiar acá.**
 *
 * Ojo con el orden de las operaciones, que no es el intuitivo: el IVA se
 * calcula sobre el subtotal SIN descontar, y recién después se resta el
 * descuento. Así lo hace el backend.
 */

export const IVA_RATE = 0.21;

export function calcTax(subtotal: number): number {
  return Math.round(subtotal * IVA_RATE * 100) / 100;
}

export type SaleTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

export function calcSaleTotals(input: {
  subtotal: number;
  discount: number;
  requiresFactura: boolean;
}): SaleTotals {
  const tax = input.requiresFactura ? calcTax(input.subtotal) : 0;
  return {
    subtotal: input.subtotal,
    discount: input.discount,
    tax,
    total: input.subtotal - input.discount + tax,
  };
}

/** `$1.234` — el formato que ya usaban todas las pantallas. */
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("es-AR")}`;
}
