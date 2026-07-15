import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError, createSale } from "@/lib/api";
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
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const subtotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const contactName = client.company || `${client.firstName} ${client.lastName}`;

  const mutation = useMutation({
    mutationFn: () =>
      createSale({
        contactId: client.id,
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
          unitPrice: c.product.price,
        })),
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
                  ${(item.product.price * item.quantity).toLocaleString("es-AR")}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-neutral-100 pt-2 font-semibold text-neutral-900">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString("es-AR")}</span>
          </div>
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
          {mutation.isPending ? "Confirmando..." : `Confirmar venta · $${subtotal.toLocaleString("es-AR")}`}
        </button>
      </div>
    </div>
  );
}
