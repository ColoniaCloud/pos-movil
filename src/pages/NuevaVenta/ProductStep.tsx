import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, ArrowRight, Minus, Plus, Package } from "lucide-react";
import { QrScanner } from "@/components/QrScanner";
import { findProductBySku, searchProducts } from "@/lib/api";
import type { CartItem, Product } from "@/lib/types";

export function ProductStep({
  cart,
  onChangeQty,
  onContinue,
}: {
  cart: CartItem[];
  onChangeQty: (product: Product, quantity: number) => void;
  onContinue: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: products, isFetching } = useQuery({
    queryKey: ["products-search", debounced],
    queryFn: () => searchProducts(debounced),
  });

  const qtyInCart = (productId: string) => cart.find((c) => c.product.id === productId)?.quantity ?? 0;
  const subtotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  async function handleScan(sku: string) {
    setScanning(false);
    setScanError(null);
    try {
      const product = await findProductBySku(sku);
      if (!product) {
        setScanError(`No se encontró ningún producto con SKU "${sku}"`);
        return;
      }
      onChangeQty(product, qtyInCart(product.id) + 1);
    } catch {
      setScanError("No se pudo buscar el producto escaneado");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-2 p-4 pb-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto por nombre o SKU..."
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base"
        />
        <button
          onClick={() => setScanning(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 py-3 text-sm font-semibold text-neutral-700 active:bg-neutral-100"
        >
          <Camera className="h-4 w-4" strokeWidth={2} />
          Escanear QR / código
        </button>
        {scanError && <p className="text-sm text-red-600">{scanError}</p>}
      </div>

      <div className="flex-1 divide-y divide-neutral-200 overflow-y-auto px-4">
        {isFetching && <p className="py-4 text-center text-neutral-500">Buscando...</p>}
        {!isFetching && products?.length === 0 && (
          <p className="py-4 text-center text-neutral-500">Sin resultados</p>
        )}
        {products?.map((product) => {
          const qty = qtyInCart(product.id);
          return (
            <div key={product.id} className="flex items-center gap-3 py-3">
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
                <p className="truncate font-medium text-neutral-900">{product.name}</p>
                <p className="text-sm text-neutral-500">
                  {product.sku ?? "sin SKU"} · ${product.price.toLocaleString("es-AR")}
                </p>
              </div>
              {qty === 0 ? (
                <button
                  onClick={() => onChangeQty(product, 1)}
                  disabled={product.stock <= 0}
                  className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-300"
                  style={{ background: product.stock > 0 ? "#e4622c" : undefined }}
                >
                  {product.stock > 0 ? "Agregar" : "Sin stock"}
                </button>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => onChangeQty(product, qty - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-200 active:bg-neutral-300"
                  >
                    <Minus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  <span className="w-5 text-center font-semibold">{qty}</span>
                  <button
                    onClick={() => onChangeQty(product, qty + 1)}
                    disabled={qty >= product.stock}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-200 active:bg-neutral-300 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-neutral-200 bg-white p-4">
        <button
          onClick={onContinue}
          disabled={itemCount === 0}
          className="flex w-full items-center justify-between rounded-xl px-4 py-3 font-semibold text-white disabled:opacity-40"
          style={{ background: "#e4622c" }}
        >
          <span>{itemCount} producto{itemCount === 1 ? "" : "s"}</span>
          <span className="flex items-center gap-1">
            ${subtotal.toLocaleString("es-AR")} · Continuar <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </div>

      {scanning && <QrScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </div>
  );
}
