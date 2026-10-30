import { useState } from "react";
import { ArrowRight, Camera, CheckCircle2, Minus, Package, Plus, X } from "lucide-react";
import type { Product } from "@/lib/types";

// Lo que aparece después de escanear: primero cuántas unidades, después si se
// sigue escaneando o se pasa a facturar. En ruta el vendedor suele cargar varios
// rollos iguales de una — sin la cantidad tenía que escanear el mismo QR N veces
// o volver a la lista a tocar el "+".
export function ScanQuantityDialog({
  product,
  inCart,
  onAdd,
  onScanAnother,
  onContinue,
  onClose,
}: {
  product: Product;
  /** Unidades de este producto que ya estaban en la venta antes de escanear. */
  inCart: number;
  onAdd: (quantity: number) => void;
  onScanAnother: () => void;
  onContinue: () => void;
  onClose: () => void;
}) {
  const available = Math.max(0, product.stock - inCart);
  const [quantity, setQuantity] = useState(available > 0 ? 1 : 0);
  const [added, setAdded] = useState<number | null>(null);

  const clamp = (n: number) => Math.max(1, Math.min(available, Math.floor(n) || 1));

  function handleAdd() {
    onAdd(quantity);
    setAdded(quantity);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full space-y-4 rounded-t-2xl bg-white p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                <Package className="h-5 w-5" strokeWidth={1.5} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-neutral-900">{product.name}</p>
            <p className="text-sm text-neutral-500">
              {product.sku ?? "sin SKU"} · ${product.price.toLocaleString("es-AR")}
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-500" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {added === null ? (
          available === 0 ? (
            <>
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {inCart > 0
                  ? `Ya tenés en la venta las ${inCart} unidades en stock.`
                  : "Este producto no tiene stock."}
              </p>
              <button
                onClick={onScanAnother}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 py-3 font-semibold text-neutral-700 active:bg-neutral-100"
              >
                <Camera className="h-4 w-4" strokeWidth={2} />
                Escanear otro
              </button>
            </>
          ) : (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-700">¿Cuántas unidades agregás a la venta?</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => clamp(q - 1))}
                    disabled={quantity <= 1}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-200 active:bg-neutral-300 disabled:opacity-40"
                    aria-label="Restar una"
                  >
                    <Minus className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={available}
                    value={quantity}
                    onChange={(e) => setQuantity(clamp(Number(e.target.value)))}
                    onFocus={(e) => e.target.select()}
                    className="h-12 min-w-0 flex-1 rounded-xl border border-neutral-300 text-center text-xl font-semibold"
                  />
                  <button
                    onClick={() => setQuantity((q) => clamp(q + 1))}
                    disabled={quantity >= available}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-200 active:bg-neutral-300 disabled:opacity-40"
                    aria-label="Sumar una"
                  >
                    <Plus className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  {available} disponible{available === 1 ? "" : "s"}
                  {inCart > 0 && ` · ya hay ${inCart} en la venta`}
                </p>
              </div>
              <button
                onClick={handleAdd}
                className="w-full rounded-xl py-3 font-semibold text-white"
                style={{ background: "#e4622c" }}
              >
                Agregar {quantity} a la venta
              </button>
            </>
          )
        ) : (
          <>
            <p className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />
              Agregaste {added} unidad{added === 1 ? "" : "es"}. ¿Seguís escaneando o continuás con la venta?
            </p>
            <button
              onClick={onScanAnother}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 py-3 font-semibold text-neutral-700 active:bg-neutral-100"
            >
              <Camera className="h-4 w-4" strokeWidth={2} />
              Escanear otro QR
            </button>
            <button
              onClick={onContinue}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white"
              style={{ background: "#e4622c" }}
            >
              Continuar con la venta <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
