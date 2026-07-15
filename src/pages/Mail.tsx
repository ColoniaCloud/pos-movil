import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail as MailIcon, CheckCircle2 } from "lucide-react";
import { Screen } from "@/components/Screen";
import { ClientStep } from "@/pages/NuevaVenta/ClientStep";
import { SendRemitoForm } from "@/components/SendRemitoForm";
import { listSales } from "@/lib/api";
import type { Client } from "@/lib/types";

export function Mail() {
  const queryClient = useQueryClient();
  const [client, setClient] = useState<Client | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [sentInfo, setSentInfo] = useState<{ saleId: string; email: string } | null>(null);

  const { data: sales, isLoading } = useQuery({
    queryKey: ["client-sales", client?.id],
    queryFn: () => listSales(client!.id),
    enabled: !!client,
  });

  if (!client) {
    return (
      <Screen title="Mail · Cliente">
        <ClientStep onSelect={setClient} />
      </Screen>
    );
  }

  return (
    <Screen title="Mail" onBack={() => setClient(null)}>
      <div className="p-4">
        <p className="mb-3 text-sm text-neutral-500">
          Cliente:{" "}
          <span className="font-semibold text-neutral-900">
            {client.company || `${client.firstName} ${client.lastName}`}
          </span>
        </p>

        {isLoading && <p className="text-neutral-500">Cargando ventas...</p>}
        {!isLoading && sales?.length === 0 && (
          <p className="text-neutral-500">Este cliente todavía no tiene ventas.</p>
        )}

        <div className="divide-y divide-neutral-200 rounded-xl bg-white shadow-sm">
          {sales?.map((sale) => (
            <div key={sale.id}>
              <button
                onClick={() => {
                  setSentInfo(null);
                  setSelectedSaleId(selectedSaleId === sale.id ? null : sale.id);
                }}
                className="flex w-full items-center justify-between px-4 py-4 text-left active:bg-neutral-100"
              >
                <div>
                  <p className="font-semibold text-neutral-900">Venta #{sale.number}</p>
                  <p className="text-sm text-neutral-500">
                    {new Date(sale.createdAt).toLocaleDateString("es-AR")} · $
                    {sale.total.toLocaleString("es-AR")}
                  </p>
                </div>
                <MailIcon className="h-5 w-5 text-neutral-400" strokeWidth={1.5} />
              </button>

              {selectedSaleId === sale.id && (
                <div className="px-4 pb-4">
                  {sentInfo?.saleId === sale.id ? (
                    <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                      <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                      Remito enviado a {sentInfo.email}
                    </div>
                  ) : (
                    <SendRemitoForm
                      saleId={sale.id}
                      defaultEmail={client.email ?? ""}
                      onSuccess={(sentTo) => {
                        setSentInfo({ saleId: sale.id, email: sentTo });
                        queryClient.invalidateQueries({ queryKey: ["client-sales", client.id] });
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}
