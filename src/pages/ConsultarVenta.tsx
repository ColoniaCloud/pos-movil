import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Screen } from "@/components/Screen";
import { listSales } from "@/lib/api";
import type { SaleListItem } from "@/lib/types";

// Antes el badge salia unicamente del saldo, asi que una venta anulada —que
// conserva su total— se mostraba como "Pendiente", indistinguible de una viva.
function statusBadge(sale: SaleListItem) {
  const base = "rounded-full px-2 py-0.5 text-xs font-medium";
  if (sale.status === "CANCELLED")
    return <span className={`${base} bg-neutral-200 text-neutral-600`}>Anulada</span>;
  if (sale.status === "PENDING")
    return <span className={`${base} bg-blue-100 text-blue-700`}>Sin confirmar</span>;
  if (sale.remaining <= 0)
    return <span className={`${base} bg-green-100 text-green-700`}>Pagada</span>;
  return <span className={`${base} bg-amber-100 text-amber-700`}>Pendiente</span>;
}

export function ConsultarVenta() {
  const navigate = useNavigate();
  const { data: sales, isLoading, error } = useQuery({ queryKey: ["sales"], queryFn: () => listSales() });

  return (
    <Screen title="Consultar venta">
      <div className="divide-y divide-neutral-200">
        {isLoading && <p className="p-4 text-neutral-500">Cargando...</p>}
        {error && <p className="p-4 text-red-600">No se pudieron cargar las ventas</p>}
        {sales?.length === 0 && <p className="p-4 text-neutral-500">Todavía no hay ventas.</p>}
        {sales?.map((sale) => (
          <button
            key={sale.id}
            onClick={() => navigate(`/ventas/${sale.id}`)}
            className="flex w-full items-center justify-between px-4 py-4 text-left active:bg-neutral-100"
          >
            <div>
              <p className="font-semibold text-neutral-900">
                #{sale.number} · {sale.contactName}
              </p>
              <p className="text-sm text-neutral-500">
                {new Date(sale.createdAt).toLocaleDateString("es-AR")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-neutral-900">${sale.total.toLocaleString("es-AR")}</p>
              {statusBadge(sale)}
            </div>
          </button>
        ))}
      </div>
    </Screen>
  );
}
