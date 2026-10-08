import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { ApiError, signRemito } from "@/lib/api";
import { SignaturePad } from "./SignaturePad";

/**
 * El cliente firma el remito en el teléfono del vendedor. Firmar es entregar:
 * al guardarse, la venta queda entregada en el CRM y le llega la copia firmada.
 *
 * El POS no tiene modo offline: sin señal la firma NO se guarda. Se dice así,
 * sin vueltas, y se ofrece reintentar — o dejarlo para después, que es mandarle
 * el link al cliente desde el detalle de la venta.
 */
export function RemitoFirma({
  saleId,
  remitoNumber,
  contactEmail,
  onSigned,
}: {
  saleId: string;
  remitoNumber: number | null;
  contactEmail: string | null;
  onSigned: (result: { sentTo: string | null; emailSaved: boolean }) => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [saveEmail, setSaveEmail] = useState(true);
  const [conforme, setConforme] = useState(false);
  const [error, setError] = useState<{ offline: boolean; message: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      signRemito(saleId, {
        signature: image!,
        name: name.trim(),
        dni: dni.trim() || undefined,
        email: contactEmail ? undefined : email.trim() || undefined,
        saveEmail: !contactEmail && !!email.trim() && saveEmail,
      }),
    onSuccess: onSigned,
    onError: (err) =>
      setError(
        err instanceof ApiError
          ? { offline: false, message: err.message }
          : { offline: true, message: "Sin conexión: la firma no se guardó." }
      ),
  });

  const listo = !!image && name.trim().length >= 3 && conforme && !mutation.isPending;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          Firma del cliente{remitoNumber ? ` · Remito N° ${remitoNumber}` : ""}
        </h2>
        <p className="text-sm text-neutral-500">
          Pasale el teléfono al cliente. Al firmar, la venta queda entregada.
        </p>
      </div>

      <SignaturePad onChange={setImage} />

      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre y apellido de quien firma"
          autoComplete="name"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base"
        />
        <input
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          placeholder="DNI (opcional)"
          inputMode="numeric"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base"
        />
        {contactEmail ? (
          <p className="text-sm text-neutral-500">La copia firmada va a {contactEmail}.</p>
        ) : (
          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email para mandarle la copia (opcional)"
              autoComplete="email"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base"
            />
            {email.trim() && (
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input type="checkbox" checked={saveEmail} onChange={(e) => setSaveEmail(e.target.checked)} className="h-4 w-4" />
                Guardarlo en la ficha del cliente
              </label>
            )}
          </div>
        )}
        <label className="flex items-start gap-2 text-sm text-neutral-800">
          <input type="checkbox" checked={conforme} onChange={(e) => setConforme(e.target.checked)} className="mt-0.5 h-5 w-5" />
          Recibí los productos detallados en el remito, en conformidad.
        </label>
      </div>

      {error && (
        <div className={`rounded-lg px-3 py-2.5 text-sm ${error.offline ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"}`}>
          {error.offline && <WifiOff className="mr-1.5 inline h-4 w-4 align-[-2px]" />}
          {error.message}
          {error.offline && " Reintentá cuando tengas señal, o firmalo después desde el detalle de la venta."}
        </div>
      )}

      <button
        onClick={() => {
          setError(null);
          mutation.mutate();
        }}
        disabled={!listo}
        className="w-full rounded-xl py-3 font-semibold text-white active:opacity-90 disabled:opacity-40"
        style={{ background: "#e4622c" }}
      >
        {mutation.isPending ? "Guardando firma..." : error ? "Reintentar" : "Firmar remito"}
      </button>
    </div>
  );
}
