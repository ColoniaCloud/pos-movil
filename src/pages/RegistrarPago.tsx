import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { PaymentForm } from "@/components/PaymentForm";
import { listPendingPayments } from "@/lib/api";

export function RegistrarPago() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: sales, isLoading, error } = useQuery({
    queryKey: ["payments-pending"],
    queryFn: listPendingPayments,
  });

  const selected = sales?.find((s) => s.id === selectedId);

  return (
    <Screen title="Registrar pago">
      {isLoading && <p className="p-4 text-neutral-500">Cargando...</p>}
      {error && <p className="p-4 text-red-600">No se pudieron cargar las ventas pendientes</p>}
      {sales?.length === 0 && (
        <p className="p-4 text-neutral-500">No hay ventas con saldo pendiente.</p>
      )}

      <div className="divide-y divide-neutral-200">
        {sales?.map((sale) => (
          <div key={sale.id}>
            <button
              onClick={() => setSelectedId(selectedId === sale.id ? null : sale.id)}
              className="flex w-full items-center justify-between px-4 py-4 text-left active:bg-neutral-100"
            >
              <div>
                <p className="font-semibold text-neutral-900">
                  #{sale.number} · {sale.contactName}
                </p>
                <p className="text-sm text-neutral-500">
                  Total ${sale.total.toLocaleString("es-AR")}
                </p>
              </div>
              <p className="font-semibold text-amber-700">
                ${sale.remaining.toLocaleString("es-AR")}
              </p>
            </button>
            {selected?.id === sale.id && (
              <div className="px-4 pb-4">
                <PaymentForm
                  saleId={sale.id}
                  remaining={sale.remaining}
                  onSuccess={() => {
                    setSelectedId(null);
                    queryClient.invalidateQueries({ queryKey: ["payments-pending"] });
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Screen>
  );
}
