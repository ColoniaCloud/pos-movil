import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError, createSale } from "@/lib/api";
import { IVA_RATE, calcSaleTotals, formatMoney } from "@/lib/money";
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

  const subtotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const contactName = client.company || `${client.firstName} ${client.lastName}`;

  const typedDiscount = Number(discountInput);
  const requestedDiscount =
    discountInput.trim() === "" || !Number.isFinite(typedDiscount) ? 0 : Math.max(0, typedDiscount);
  // El backend acepta cualquier descuento no negativo, así que uno mayor al
  // subtotal daría un total negativo. Lo topamos acá y lo decimos.
  const discount = Math.min(requestedDiscount, subtotal);
  const discountExceedsSubtotal = requestedDiscount > subtotal;

  const totals = calcSaleTotals({ subtotal, discount, requiresFactura });

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
            {cart.map((item) => (
              <li key={item.product.id} className="flex justify-between py-1.5 text-sm">
                <span>
                  {item.quantity}x {item.product.name}
                </span>
                <span className="font-medium">
                  {formatMoney(item.product.price * item.quantity)}
                </span>
              </li>
            ))}
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
            max={subtotal}
            step="0.01"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base"
          />
          {discountExceedsSubtotal && (
            <p className="mt-2 text-sm text-amber-700">
              El descuento no puede superar el subtotal. Se va a aplicar{" "}
              {formatMoney(subtotal)}.
            </p>
          )}

          <dl className="mt-4 space-y-1 border-t border-neutral-100 pt-3 text-sm">
            <div className="flex justify-between text-neutral-500">
              <dt>Subtotal</dt>
              <dd>{formatMoney(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-neutral-500">
                <dt>Descuento</dt>
                <dd>−{formatMoney(totals.discount)}</dd>
              </div>
            )}
            {requiresFactura && (
              <div className="flex justify-between text-neutral-500">
                <dt>IVA ({Math.round(IVA_RATE * 100)}%)</dt>
                <dd>{formatMoney(totals.tax)}</dd>
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
