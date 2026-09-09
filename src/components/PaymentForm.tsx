import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError, createPayment } from "@/lib/api";
import type { PaymentMethod } from "@/lib/types";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CARD", label: "Tarjeta" },
  { value: "CHECK", label: "Cheque" },
  { value: "OTHER", label: "Otro" },
];

export function PaymentForm({
  saleId,
  remaining,
  onSuccess,
}: {
  saleId: string;
  remaining: number;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Ni el form ni el endpoint validaban el techo, así que cobrar de más dejaba
  // la venta con saldo negativo. En la ruta, tipeando el monto a mano sobre el
  // teléfono, el error de tipeo es fácil.
  const typedAmount = Number(amount);
  const amountIsValid = Number.isFinite(typedAmount) && typedAmount > 0;
  const exceedsRemaining = amountIsValid && typedAmount > remaining;

  const mutation = useMutation({
    mutationFn: () =>
      createPayment({ saleId, amount: typedAmount, method, reference: reference || undefined }),
    onSuccess,
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo registrar el pago"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!amountIsValid || exceedsRemaining) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-neutral-50 p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Monto</label>
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          max={remaining}
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base"
        />
        {exceedsRemaining && (
          <p className="mt-1 text-sm text-amber-700">
            El saldo de esta venta es ${remaining.toLocaleString("es-AR")}. No se puede cobrar de
            más.
          </p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Método</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base"
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Referencia (opcional)
        </label>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="N° de operación, cheque, etc."
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={mutation.isPending || !amountIsValid || exceedsRemaining}
        className="w-full rounded-lg py-2.5 font-semibold text-white active:opacity-90 disabled:opacity-60"
        style={{ background: "#e4622c" }}
      >
        {mutation.isPending ? "Registrando..." : "Registrar pago"}
      </button>
    </form>
  );
}
