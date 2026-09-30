import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError, createSale } from "@/lib/api";
import { calcItemTagDiscount, calcSaleTotals, describeTag, formatMoney } from "@/lib/money";
import type { CartItem, Client, SaleDetail } from "@/lib/types";

export function InvoiceStep({
  client,
  cart,
  onCreated,
}: {
  client: Client;
  cart: CartItem[];
  onCreated: (sale: SaleDetail) => void;
}) {
  const [requiresFactura, setRequiresFactura] = useState(false);
  const [taxId, setTaxId] = useState(client.cuit ?? "");
  const [discountInput, setDiscountInput] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const contactName = client.company || `${client.firstName} ${client.lastName}`;

  // Cada línea con la etiqueta que el CRM le asignó a ESE producto para ESTE
  // cliente (llega en `product.discountTag`, ver searchProducts). El POS no
  // decide cuál va: la precedencia vive en el CRM.
  const lines = cart.map((c) => ({
    item: c,
    total: c.product.price * c.quantity,
    tag: c.product.discountTag ?? null,
  }));

  const typedDiscount = Number(discountInput);
  const requestedDiscount =
    discountInput.trim() === "" || !Number.isFinite(typedDiscount) ? 0 : Math.max(0, typedDiscount);

  // El CRM aplica el descuento igual al crear la venta —el que vale es el que
  // calcula el servidor—; acá se recalcula solo para que el vendedor cante el
  // precio correcto ANTES de confirmar y no quede anotado otro. Ese era
  // exactamente el problema que resolvió calcSaleTotals con el IVA, y una
  // etiqueta del 20% lo traía de vuelta por otra puerta.
  const totals = calcSaleTotals({ lines, discount: requestedDiscount, requiresFactura });
  // Solo para el cartel de "no queda tanto para descontar": si alguna línea
  // llevó etiqueta, el tope del descuento a mano es más bajo y hay que decirlo.
  const hayEtiquetas = totals.tagDiscount > 0;
  // El backend acepta cualquier descuento no negativo, así que uno que se pase
  // del subtotal daría un total negativo. Lo topa calcSaleTotals; acá solo se
  // avisa cuando lo tipeado no entró entero.
  const discount = totals.manualDiscount;
  const discountExceedsSubtotal = requestedDiscount > totals.manualDiscount;

  const mutation = useMutation({
    mutationFn: () =>
      createSale({
        contactId: client.id,
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
          unitPrice: c.product.price,
        })),
        discount: discount > 0 ? discount : undefined,
        requiresFactura,
        taxId: requiresFactura ? taxId || undefined : undefined,
        notes: notes || undefined,
      }),
    onSuccess: onCreated,
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo registrar la venta"),
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Cliente</p>
          <p className="font-semibold text-neutral-900">{contactName}</p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm text-neutral-500">Productos</p>
          <ul className="divide-y divide-neutral-100">
            {lines.map((line) => {
              const descuento = calcItemTagDiscount(line);
              return (
                <li key={line.item.product.id} className="py-1.5 text-sm">
                  <div className="flex justify-between">
                    <span>
                      {line.item.quantity}x {line.item.product.name}
                    </span>
                    <span className="font-medium">{formatMoney(line.total)}</span>
                  </div>
                  {/* El desglose por línea es el punto de todo el cambio: acá se
                      ve que a una lámina se le descuenta y a otra no. Sin esto el
                      vendedor ve un descuento global y no sabe de dónde salió. */}
                  {descuento > 0 && line.tag ? (
                    <div
                      className="flex justify-between text-xs"
                      style={{ color: "#e4622c" }}
                    >
                      <span>{describeTag(line.tag)}</span>
                      <span>−{formatMoney(descuento)}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400">Sin descuento</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <label className="flex items-center justify-between">
            <span className="font-medium text-neutral-900">¿Requiere facturación?</span>
            <input
              type="checkbox"
              checked={requiresFactura}
              onChange={(e) => setRequiresFactura(e.target.checked)}
              className="h-6 w-6"
            />
          </label>

          {requiresFactura ? (
            <input
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="RUT / CUIT / CUIL"
              className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base"
            />
          ) : (
            <p className="mt-2 text-sm text-neutral-500">
              Se factura solo con el nombre del cliente ({contactName}).
            </p>
          )}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Descuento (opcional)
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max={totals.subtotal}
            step="0.01"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base"
          />
          {discountExceedsSubtotal && (
            <p className="mt-2 text-sm text-amber-700">
              {hayEtiquetas
                ? `Con los descuentos por ítem no queda tanto para descontar. Se va a aplicar ${formatMoney(totals.manualDiscount)}.`
                : `El descuento no puede superar el subtotal. Se va a aplicar ${formatMoney(totals.manualDiscount)}.`}
            </p>
          )}

          <dl className="mt-4 space-y-1 border-t border-neutral-100 pt-3 text-sm">
            <div className="flex justify-between text-neutral-500">
              <dt>Subtotal</dt>
              <dd>{formatMoney(totals.subtotal)}</dd>
            </div>
            {totals.tagDiscount > 0 && (
              <div className="flex justify-between font-medium" style={{ color: "#e4622c" }}>
                {/* Sin nombrar una etiqueta: la venta puede tener varias, una por
                    ítem. El detalle está arriba, línea por línea. */}
                <dt>Descuentos por ítem</dt>
                <dd>−{formatMoney(totals.tagDiscount)}</dd>
              </div>
            )}
            {totals.manualDiscount > 0 && (
              <div className="flex justify-between text-neutral-500">
                <dt>Descuento a mano</dt>
                <dd>−{formatMoney(totals.manualDiscount)}</dd>
              </div>
            )}
            {requiresFactura && (
              <div className="flex justify-between text-neutral-500">
                <dt>Factura</dt>
                <dd>Se emite por el total (IVA incluido)</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-100 pt-1 text-base font-semibold text-neutral-900">
              <dt>Total</dt>
              <dd>{formatMoney(totals.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm text-neutral-500">Notas (opcional)</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="border-t border-neutral-200 bg-white p-4">
        <button
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
          disabled={mutation.isPending}
          className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60"
          style={{ background: "#e4622c" }}
        >
          {mutation.isPending ? "Confirmando..." : `Confirmar venta · ${formatMoney(totals.total)}`}
        </button>
      </div>
    </div>
  );
}
