import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, PenLine } from "lucide-react";
import { Screen } from "@/components/Screen";
import { RemitoFirma } from "@/components/RemitoFirma";
import { RemitoLink } from "@/components/RemitoLink";
import { clearDraft, loadDraft, saveDraft } from "@/lib/sale-draft";
import { ClientStep } from "./ClientStep";
import { ProductStep } from "./ProductStep";
import { InvoiceStep } from "./InvoiceStep";
import type { CartItem, Client, Product, SaleDetail } from "@/lib/types";

// `listo`: la venta ya está en el CRM (confirmada). Ahí se elige entregar ahora
// —`firma`: el cliente firma el remito en el teléfono— o después, mandándole
// el link. `entregada`: firmó; la venta quedó entregada.
type Step = "cliente" | "productos" | "facturacion" | "listo" | "firma" | "entregada";

const TITLES: Record<Step, string> = {
  cliente: "Nueva venta · Cliente",
  productos: "Nueva venta · Productos",
  facturacion: "Nueva venta · Facturación",
  listo: "Venta registrada",
  firma: "Firma del remito",
  entregada: "Venta entregada",
};

export function NuevaVenta() {
  const navigate = useNavigate();
  // Lo que haya quedado a medio armar antes — el teléfono se pasa el día en el
  // bolsillo y el sistema mata la pestaña en segundo plano. Se lee una sola vez
  // por montaje, no a nivel de módulo: si no, al volver a entrar restauraría un
  // borrador ya consumido.
  const [restored] = useState(loadDraft);
  const [step, setStep] = useState<Step>(restored?.client ? "productos" : "cliente");
  const [client, setClient] = useState<Client | null>(restored?.client ?? null);
  const [cart, setCart] = useState<CartItem[]>(restored?.cart ?? []);
  const [createdSale, setCreatedSale] = useState<SaleDetail | null>(null);
  const [signedInfo, setSignedInfo] = useState<{ sentTo: string | null; emailSaved: boolean } | null>(null);
  const [laterOpen, setLaterOpen] = useState(false);

  // Se guarda mientras la venta se arma y se borra apenas el CRM la confirma:
  // pasado ese punto la venta ya vive en el CRM y el borrador sólo estorbaría.
  useEffect(() => {
    if (createdSale) return;
    saveDraft({ client, cart });
  }, [client, cart, createdSale]);

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
    else if (step === "firma") setStep("listo");
    else navigate(-1);
  }

  return (
    <Screen title={TITLES[step]} onBack={step === "listo" || step === "entregada" ? null : backStep}>
      {step === "cliente" && (
        <ClientStep
          onSelect={(c) => {
            setClient(c);
            setStep("productos");
          }}
        />
      )}

      {step === "productos" && (
        <ProductStep
          contactId={client!.id}
          cart={cart}
          onChangeQty={handleChangeQty}
          onContinue={() => setStep("facturacion")}
        />
      )}

      {step === "facturacion" && client && (
        <InvoiceStep
          client={client}
          cart={cart}
          onCreated={(sale) => {
            clearDraft();
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
            {createdSale.remito && (
              <>
                <p className="text-sm font-medium text-neutral-700">¿Entregás ahora?</p>
                <button
                  onClick={() => setStep("firma")}
                  className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white"
                  style={{ background: "#e4622c" }}
                >
                  <PenLine className="h-5 w-5" strokeWidth={1.5} />
                  Entregar ahora · firma
                </button>
                {laterOpen ? (
                  <RemitoLink saleId={createdSale.id} />
                ) : (
                  <button
                    onClick={() => setLaterOpen(true)}
                    className="rounded-xl border border-neutral-300 py-3 font-semibold text-neutral-700"
                  >
                    Entregar después
                  </button>
                )}
                <div className="my-1 h-px bg-neutral-200" />
              </>
            )}
            <button
              onClick={() => navigate(`/ventas/${createdSale.id}`)}
              className="rounded-xl border border-neutral-300 py-3 font-semibold text-neutral-700"
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

      {step === "firma" && createdSale && (
        <RemitoFirma
          saleId={createdSale.id}
          remitoNumber={createdSale.remito?.number ?? null}
          contactEmail={createdSale.contact.email || null}
          onSigned={(r) => {
            setSignedInfo(r);
            setStep("entregada");
          }}
        />
      )}

      {step === "entregada" && createdSale && (
        <div className="flex flex-col items-center gap-4 p-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-600" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-neutral-900">Remito firmado</p>
          <p className="text-neutral-500">
            La venta #{createdSale.number} quedó entregada.
            {signedInfo?.sentTo ? ` Le mandamos la copia a ${signedInfo.sentTo}.` : " No se mandó copia por mail."}
            {signedInfo?.emailSaved ? " El email quedó guardado en la ficha." : ""}
          </p>
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
