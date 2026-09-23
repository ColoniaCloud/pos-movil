import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, AlertTriangle, Check, Minus, Plus, Undo2 } from "lucide-react";
import { Screen } from "@/components/Screen";
import { ApiError, createSaleReturn, getSaleReturns, listSales } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/lib/money";
import type { RefundMethod, SaleListItem } from "@/lib/types";

/**
 * Devolución de mercadería, total o parcial, sobre una venta ya entregada.
 *
 * Dos pasos: se elige la venta y después qué vuelve. Se puede entrar con la
 * venta ya elegida (`/devolucion?venta=<id>`), que es como llega el vendedor
 * desde el detalle de la venta — que es el camino real: primero mira la venta
 * con el cliente al lado, recién después decide devolver.
 *
 * Quién puede cerrarla: ADMIN o SUPERADMIN, igual que anular una venta en el
 * CRM. El vendedor OPERATOR ve todo —qué se devolvió y qué queda por
 * devolver— pero no confirma. El backend lo vuelve a chequear igual.
 */
export function Devolucion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const saleId = searchParams.get("venta");
  const puedeConfirmar = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  if (!saleId) {
    return <ElegirVenta onPick={(id) => setSearchParams({ venta: id })} />;
  }

  return (
    <FormularioDevolucion
      saleId={saleId}
      puedeConfirmar={puedeConfirmar}
      onDone={() => {
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      }}
      onVolverALista={() => setSearchParams({})}
    />
  );
}

/** Solo las ventas que movieron mercadería admiten devolución. */
function esDevolvible(sale: SaleListItem) {
  return sale.status === "CONFIRMED" || sale.status === "DELIVERED";
}

function ElegirVenta({ onPick }: { onPick: (saleId: string) => void }) {
  const [search, setSearch] = useState("");
  const { data: sales, isLoading, isError } = useQuery({
    queryKey: ["sales"],
    queryFn: () => listSales(),
  });

  const devolvibles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (sales ?? [])
      .filter(esDevolvible)
      .filter(
        (s) =>
          term === "" ||
          s.contactName.toLowerCase().includes(term) ||
          String(s.number).includes(term)
      );
  }, [sales, search]);

  return (
    <Screen title="Hacer devolución">
      {isLoading && <p className="p-4 text-neutral-500">Cargando...</p>}
      {isError && <p className="p-4 text-red-600">No se pudieron cargar las ventas</p>}

      {sales && (
        <>
          <div className="p-4 pb-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente o número..."
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base"
            />
            <p className="mt-2 text-sm text-neutral-500">
              Solo aparecen las ventas confirmadas o entregadas: son las únicas que sacaron
              mercadería.
            </p>
          </div>

          {devolvibles.length === 0 && (
            <p className="p-4 text-neutral-500">
              {search.trim()
                ? "Ninguna venta coincide con la búsqueda."
                : "No hay ventas entregadas para devolver."}
            </p>
          )}

          <div className="divide-y divide-neutral-200">
            {devolvibles.map((sale) => (
              <button
                key={sale.id}
                onClick={() => onPick(sale.id)}
                className="flex w-full items-center justify-between px-4 py-4 text-left active:bg-neutral-100"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-900">
                    #{sale.number} · {sale.contactName}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {new Date(sale.createdAt).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-neutral-900">
                  {formatMoney(sale.total)}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}

function FormularioDevolucion({
  saleId,
  puedeConfirmar,
  onDone,
  onVolverALista,
}: {
  saleId: string;
  puedeConfirmar: boolean;
  onDone: () => void;
  onVolverALista: () => void;
}) {
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [refund, setRefund] = useState<RefundMethod>("CREDIT_NOTE");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hecha, setHecha] = useState<{ number: number; total: number; retainedRolls: string[] } | null>(
    null
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sale-returns", saleId],
    queryFn: () => getSaleReturns(saleId),
  });

  const pendientes = useMemo(
    () => (data?.items ?? []).filter((i) => i.returnable > 0),
    [data]
  );

  const subtotal = useMemo(
    () =>
      pendientes.reduce((suma, item) => suma + (quantities[item.saleItemId] ?? 0) * item.unitPrice, 0),
    [pendientes, quantities]
  );

  // El CRM manda la proporción; acá solo se multiplica. Si la app calculara su
  // propio IVA, el vendedor le cantaría un importe al cliente y el CRM
  // emitiría otro — que es exactamente lo que ya pasó con los totales de venta.
  const total = Math.round(subtotal * (data?.creditRatio ?? 1) * 100) / 100;

  const seleccion = pendientes
    .map((item) => ({ saleItemId: item.saleItemId, quantity: quantities[item.saleItemId] ?? 0 }))
    .filter((x) => x.quantity > 0);

  const mutation = useMutation({
    mutationFn: () => createSaleReturn(saleId, { refund, reason: reason.trim() || undefined, items: seleccion }),
    onSuccess: (res) => {
      setHecha({ number: res.number, total: res.total, retainedRolls: res.retainedRolls ?? [] });
      setQuantities({});
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["sale-returns", saleId] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "No se pudo registrar la devolución"),
  });

  function setQty(saleItemId: string, quantity: number, max: number) {
    const limpio = Math.max(0, Math.min(quantity, max));
    setQuantities((prev) => ({ ...prev, [saleItemId]: limpio }));
  }

  if (isLoading) {
    return (
      <Screen title="Hacer devolución" onBack={onVolverALista}>
        <p className="p-4 text-neutral-500">Cargando...</p>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen title="Hacer devolución" onBack={onVolverALista}>
        <p className="p-4 text-red-600">No se pudo cargar la venta</p>
      </Screen>
    );
  }

  if (hecha) {
    return (
      <Screen title="Devolución registrada" onBack={onVolverALista}>
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <Check className="h-7 w-7 text-green-700" strokeWidth={2.5} />
          </div>
          <p className="text-lg font-semibold text-neutral-900">Devolución #{hecha.number}</p>
          <p className="text-neutral-600">
            Se le acreditaron {formatMoney(hecha.total)} a la cuenta del cliente
            {refund === "CASH" ? " y se registró el efectivo que salió de la caja." : "."}
          </p>
          {hecha.retainedRolls.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-left text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {hecha.retainedRolls.join(", ")} no volvió a stock: el cliente final ya había
                activado esa garantía. Avisale a la oficina.
              </span>
            </p>
          )}
          <button
            onClick={onVolverALista}
            className="mt-2 rounded-xl px-5 py-3 font-semibold text-white"
            style={{ background: "#e4622c" }}
          >
            Hacer otra devolución
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title={`Devolver · venta #${data.saleNumber}`} onBack={onVolverALista}>
      <div className="space-y-4 p-4">
        {!data.returnable && (
          <p className="flex items-start gap-2 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Esta venta no admite devoluciones: o todavía no se confirmó, o está anulada y su
              stock ya volvió.
            </span>
          </p>
        )}

        {data.returns.length > 0 && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-semibold text-neutral-900">Ya devuelto</h2>
            <ul className="space-y-2 text-sm">
              {data.returns.map((r) => (
                <li key={r.id} className="flex justify-between gap-3">
                  <span className="text-neutral-600">
                    #{r.number} · {new Date(r.createdAt).toLocaleDateString("es-AR")} ·{" "}
                    {r.refund === "CASH" ? "efectivo" : "nota de crédito"}
                  </span>
                  <span className="shrink-0 font-medium">{formatMoney(r.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.returnable && pendientes.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-neutral-600 shadow-sm">
            Ya se devolvió todo lo que salió en esta venta.
          </p>
        ) : (
          data.returnable && (
            <>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="mb-3 font-semibold text-neutral-900">Qué vuelve</h2>
                <div className="space-y-3">
                  {pendientes.map((item) => {
                    const qty = quantities[item.saleItemId] ?? 0;
                    return (
                      <div
                        key={item.saleItemId}
                        className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-3 first:border-0 first:pt-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-900">{item.productName}</p>
                          <p className="text-sm text-neutral-500">
                            {item.returnable} de {item.quantity} sin devolver ·{" "}
                            {formatMoney(item.unitPrice)} c/u
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => setQty(item.saleItemId, qty - 1, item.returnable)}
                            disabled={qty <= 0}
                            aria-label={`Quitar una unidad de ${item.productName}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-200 active:bg-neutral-300 disabled:opacity-40"
                          >
                            <Minus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          <span className="w-5 text-center font-semibold">{qty}</span>
                          <button
                            onClick={() => setQty(item.saleItemId, qty + 1, item.returnable)}
                            disabled={qty >= item.returnable}
                            aria-label={`Agregar una unidad de ${item.productName}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-200 active:bg-neutral-300 disabled:opacity-40"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="mb-3 font-semibold text-neutral-900">Qué pasa con la plata</h2>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["CREDIT_NOTE", "Nota de crédito"],
                      ["CASH", "Devolver efectivo"],
                    ] as [RefundMethod, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setRefund(value)}
                      className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold ${
                        refund === value
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 text-neutral-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-neutral-500">
                  {refund === "CREDIT_NOTE"
                    ? "Le baja la deuda. Si ya había pagado todo, le queda saldo a favor."
                    : "Además de la nota de crédito se anota la plata que sale de la caja. Solo se puede reintegrar lo que el cliente pagó."}
                </p>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm">
                <label className="mb-2 block font-semibold text-neutral-900" htmlFor="motivo">
                  Motivo (opcional)
                </label>
                <textarea
                  id="motivo"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Falla de fábrica, cambio de tono, sobró rollo..."
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base"
                />
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm">
                {Math.abs((data.creditRatio ?? 1) - 1) > 0.0001 && (
                  <div className="flex justify-between text-sm text-neutral-500">
                    <span>Mercadería devuelta</span>
                    <span>{formatMoney(subtotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold text-neutral-900">
                  <span>Se le acredita</span>
                  <span>{formatMoney(total)}</span>
                </div>
                {Math.abs((data.creditRatio ?? 1) - 1) > 0.0001 && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Incluye la parte proporcional del{" "}
                    {(data.creditRatio ?? 1) > 1 ? "IVA" : "descuento"} de la venta.
                  </p>
                )}
              </div>

              {error && (
                <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </p>
              )}

              {puedeConfirmar ? (
                <button
                  onClick={() => {
                    setError(null);
                    mutation.mutate();
                  }}
                  disabled={seleccion.length === 0 || mutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold text-white disabled:bg-neutral-300"
                  style={{
                    background: seleccion.length > 0 && !mutation.isPending ? "#e4622c" : undefined,
                  }}
                >
                  <Undo2 className="h-5 w-5" strokeWidth={2} />
                  {mutation.isPending ? "Registrando..." : "Confirmar devolución"}
                </button>
              ) : (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    La devolución la cierra un administrador, igual que anular una venta. Recibí la
                    mercadería y pedí que la registren desde la oficina.
                  </span>
                </p>
              )}
            </>
          )
        )}
      </div>
    </Screen>
  );
}
