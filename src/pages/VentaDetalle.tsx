import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Wallet, StickyNote, Undo2 } from "lucide-react";
import { Screen } from "@/components/Screen";
import { PaymentForm } from "@/components/PaymentForm";
import { ApiError, addSaleNote, getSale } from "@/lib/api";

export function VentaDetalle() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<"none" | "pago" | "nota">("none");
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  const { data: sale, isLoading } = useQuery({
    queryKey: ["sale", id],
    queryFn: () => getSale(id!),
    enabled: !!id,
  });

  const noteMutation = useMutation({
    mutationFn: () => addSaleNote(id!, note),
    onSuccess: () => {
      setNote("");
      setPanel("none");
      queryClient.invalidateQueries({ queryKey: ["sale", id] });
    },
    onError: (err) => setNoteError(err instanceof ApiError ? err.message : "No se pudo agregar la nota"),
  });

  function handleNoteSubmit(e: FormEvent) {
    e.preventDefault();
    setNoteError(null);
    noteMutation.mutate();
  }

  if (isLoading || !sale) {
    return (
      <Screen title="Venta">
        <p className="p-4 text-neutral-500">Cargando...</p>
      </Screen>
    );
  }

  return (
    <Screen title={`Venta #${sale.number}`}>
      <div className="space-y-4 p-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="font-semibold text-neutral-900">
            {sale.contact.company || `${sale.contact.firstName} ${sale.contact.lastName}`}
          </p>
          <p className="text-sm text-neutral-500">
            {new Date(sale.createdAt).toLocaleString("es-AR")}
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold text-neutral-900">Productos</h2>
          <ul className="divide-y divide-neutral-100">
            {sale.items.map((item) => (
              <li key={item.id} className="flex justify-between py-2 text-sm">
                <span>
                  {item.quantity}x {item.productName}
                </span>
                <span className="font-medium">${item.total.toLocaleString("es-AR")}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1 border-t border-neutral-100 pt-2 text-sm">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span>
              <span>${sale.subtotal.toLocaleString("es-AR")}</span>
            </div>
            {sale.tax > 0 && (
              <div className="flex justify-between text-neutral-500">
                <span>Impuesto</span>
                <span>${sale.tax.toLocaleString("es-AR")}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold text-neutral-900">
              <span>Total</span>
              <span>${sale.total.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Pagado</span>
              <span>${sale.totalPaid.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between font-medium text-amber-700">
              <span>Saldo</span>
              <span>${sale.remaining.toLocaleString("es-AR")}</span>
            </div>
          </div>
        </div>

        {sale.notes && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-1 font-semibold text-neutral-900">Notas</h2>
            <p className="whitespace-pre-line text-sm text-neutral-600">{sale.notes}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setPanel(panel === "pago" ? "none" : "pago")}
            disabled={sale.remaining <= 0}
            className="flex flex-col items-center gap-1 rounded-xl bg-white py-3 text-sm font-semibold text-neutral-900 shadow-sm disabled:opacity-40"
          >
            <Wallet className="h-5 w-5" strokeWidth={1.5} />
            Pago
          </button>
          <button
            onClick={() => setPanel(panel === "nota" ? "none" : "nota")}
            className="flex flex-col items-center gap-1 rounded-xl bg-white py-3 text-sm font-semibold text-neutral-900 shadow-sm"
          >
            <StickyNote className="h-5 w-5" strokeWidth={1.5} />
            Nota
          </button>
          <button
            disabled
            title="Próximamente"
            className="flex flex-col items-center gap-1 rounded-xl bg-white py-3 text-sm font-semibold text-neutral-400 shadow-sm"
          >
            <Undo2 className="h-5 w-5" strokeWidth={1.5} />
            Devolución
          </button>
        </div>

        {panel === "pago" && (
          <PaymentForm
            saleId={sale.id}
            remaining={sale.remaining}
            onSuccess={() => {
              setPanel("none");
              queryClient.invalidateQueries({ queryKey: ["sale", id] });
            }}
          />
        )}

        {panel === "nota" && (
          <form onSubmit={handleNoteSubmit} className="space-y-3 rounded-xl bg-neutral-50 p-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              rows={3}
              placeholder="Escribí una nota sobre esta venta..."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base"
            />
            {noteError && <p className="text-sm text-red-600">{noteError}</p>}
            <button
              type="submit"
              disabled={noteMutation.isPending}
              className="w-full rounded-lg py-2.5 font-semibold text-white active:opacity-90 disabled:opacity-60"
              style={{ background: "#e4622c" }}
            >
              {noteMutation.isPending ? "Guardando..." : "Agregar nota"}
            </button>
          </form>
        )}
      </div>
    </Screen>
  );
}
