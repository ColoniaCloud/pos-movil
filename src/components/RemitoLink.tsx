import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { ApiError, getRemitoLink } from "@/lib/api";

/**
 * "Entregar después": el link para que el cliente firme desde su celular
 * cuando reciba el pedido. Al firmar, la venta pasa sola a entregada.
 *
 * WhatsApp por `wa.me` (abre el WhatsApp del vendedor con el mensaje escrito);
 * Compartir usa el menú del sistema; Copiar, para cualquier otro lado.
 */
export function RemitoLink({ saleId }: { saleId: string }) {
  const [copied, setCopied] = useState(false);
  const link = useMutation({ mutationFn: () => getRemitoLink(saleId) });

  if (!link.data) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => link.mutate()}
          disabled={link.isPending}
          className="w-full rounded-xl border border-neutral-300 bg-white py-3 font-semibold text-neutral-800 disabled:opacity-60"
        >
          {link.isPending ? "Generando link..." : "Mandar link para firmar"}
        </button>
        {link.isError && (
          <p className="text-sm text-red-600">
            {link.error instanceof ApiError ? link.error.message : "Sin conexión: probá de nuevo cuando tengas señal."}
          </p>
        )}
      </div>
    );
  }

  const { url, whatsappUrl, message } = link.data;

  async function share() {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "Remito Kristall Film", text: message, url }).catch(() => {});
      return;
    }
    await copy();
  }

  async function copy() {
    await navigator.clipboard.writeText(message).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2 rounded-xl bg-neutral-50 p-3">
      <p className="text-sm text-neutral-600">El cliente firma desde su celular cuando reciba el pedido.</p>
      <div className="grid grid-cols-3 gap-2">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1 rounded-xl bg-white py-3 text-sm font-semibold text-neutral-900 shadow-sm"
          >
            <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
            WhatsApp
          </a>
        ) : (
          <span className="flex flex-col items-center gap-1 rounded-xl bg-white py-3 text-center text-xs text-neutral-400 shadow-sm">
            <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
            Sin teléfono
          </span>
        )}
        <button onClick={share} className="flex flex-col items-center gap-1 rounded-xl bg-white py-3 text-sm font-semibold text-neutral-900 shadow-sm">
          <Share2 className="h-5 w-5" strokeWidth={1.5} />
          Compartir
        </button>
        <button onClick={copy} className="flex flex-col items-center gap-1 rounded-xl bg-white py-3 text-sm font-semibold text-neutral-900 shadow-sm">
          {copied ? <Check className="h-5 w-5 text-green-600" strokeWidth={1.5} /> : <Copy className="h-5 w-5" strokeWidth={1.5} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
