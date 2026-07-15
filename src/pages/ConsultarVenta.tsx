import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Screen } from "@/components/Screen";
import { listSales } from "@/lib/api";

function statusBadge(remaining: number) {
  if (remaining <= 0) return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Pagada</span>;
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pendiente</span>;
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
              {statusBadge(sale.remaining)}
            </div>
          </button>
        ))}
      </div>
    </Screen>
  );
}
