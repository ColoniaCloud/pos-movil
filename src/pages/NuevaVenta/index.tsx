import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Screen } from "@/components/Screen";
import { ClientStep } from "./ClientStep";
import { ProductStep } from "./ProductStep";
import { InvoiceStep } from "./InvoiceStep";
import type { CartItem, Client, Product, SaleDetail } from "@/lib/types";

type Step = "cliente" | "productos" | "facturacion" | "listo";

const TITLES: Record<Step, string> = {
  cliente: "Nueva venta · Cliente",
  productos: "Nueva venta · Productos",
  facturacion: "Nueva venta · Facturación",
  listo: "Venta registrada",
};

export function NuevaVenta() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("cliente");
  const [client, setClient] = useState<Client | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [createdSale, setCreatedSale] = useState<SaleDetail | null>(null);

  function handleChangeQty(product: Product, quantity: number) {
    setCart((prev) => {
      const clamped = Math.max(0, Math.min(quantity, product.stock));
      if (clamped === 0) return prev.filter((c) => c.product.id !== product.id);
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) => (c.product.id === product.id ? { ...c, quantity: clamped } : c));
      }
      return [...prev, { product, quantity: clamped }];
    });
  }

  function backStep() {
    if (step === "productos") setStep("cliente");
    else if (step === "facturacion") setStep("productos");
    else navigate(-1);
  }

  return (
    <Screen title={TITLES[step]} onBack={step === "listo" ? null : backStep}>
      {step === "cliente" && (
        <ClientStep
          onSelect={(c) => {
            setClient(c);
            setStep("productos");
          }}
        />
      )}

      {step === "productos" && (
        <ProductStep cart={cart} onChangeQty={handleChangeQty} onContinue={() => setStep("facturacion")} />
      )}

      {step === "facturacion" && client && (
        <InvoiceStep
          client={client}
          cart={cart}
          onCreated={(sale) => {
            setCreatedSale(sale);
            setStep("listo");
          }}
        />
      )}

      {step === "listo" && createdSale && (
        <div className="flex flex-col items-center gap-4 p-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-600" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-neutral-900">
            Venta #{createdSale.number} registrada
          </p>
          <p className="text-neutral-500">Total ${createdSale.total.toLocaleString("es-AR")}</p>
          <div className="mt-4 flex w-full max-w-xs flex-col gap-2">
            <button
              onClick={() => navigate(`/ventas/${createdSale.id}`)}
              className="rounded-xl py-3 font-semibold text-white"
              style={{ background: "#e4622c" }}
            >
              Ver venta
            </button>
            <button
              onClick={() => navigate("/")}
              className="rounded-xl border border-neutral-300 py-3 font-semibold text-neutral-700"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      )}
    </Screen>
  );
}
