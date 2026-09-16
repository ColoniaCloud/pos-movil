import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowRightLeft, CheckCircle2, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { Screen } from "@/components/Screen";
import { ApiError, addLeadNote, convertLeadToClient, getLead, listLeadActivities } from "@/lib/api";
import { sectorLabel } from "@/lib/sectors";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LeadDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmingConvert, setConfirmingConvert] = useState(false);
  // Después de convertir, el GET del lead 404ea (ya no es type=LEAD) — se
  // muestra este estado en vez de volver a pedirlo.
  const [convertedName, setConvertedName] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const {
    data: lead,
    isLoading,
    isError,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => getLead(id!),
    enabled: !!id && !convertedName,
  });

  const { data: activities } = useQuery({
    queryKey: ["lead-activities", id],
    queryFn: () => listLeadActivities(id!),
    enabled: !!id && !convertedName,
  });

  const convertMutation = useMutation({
    mutationFn: () => convertLeadToClient(id!),
    onSuccess: (client) => {
      setConfirmingConvert(false);
      setConvertedName(client.company || `${client.firstName} ${client.lastName}`.trim());
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const noteMutation = useMutation({
    mutationFn: (note: string) => addLeadNote(id!, note),
    onSuccess: () => {
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["lead-activities", id] });
    },
  });

  if (convertedName) {
    return (
      <Screen title="Convertido" onBack={null}>
        <div className="flex flex-col items-center gap-4 p-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-600" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-neutral-900">{convertedName}</p>
          <p className="text-neutral-500">Ahora es cliente.</p>
          <button
            onClick={() => navigate("/leads")}
            className="mt-4 w-full max-w-xs rounded-xl py-3 font-semibold text-white"
            style={{ background: "#e4622c" }}
          >
            Volver a leads
          </button>
        </div>
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen title="Lead">
        <p className="p-4 text-neutral-500">Cargando...</p>
      </Screen>
    );
  }

  if (isError || !lead) {
    return (
      <Screen title="Lead">
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <AlertCircle className="h-12 w-12 text-neutral-400" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-neutral-900">No se pudo cargar el lead</p>
          <p className="text-neutral-500">
            {loadError instanceof ApiError ? loadError.message : "Revisá la conexión y reintentá."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 rounded-xl px-6 py-3 font-semibold text-white active:opacity-90"
            style={{ background: "#e4622c" }}
          >
            Reintentar
          </button>
        </div>
      </Screen>
    );
  }

  const displayName = lead.company || `${lead.firstName} ${lead.lastName}`.trim();
  const subName = lead.company ? `${lead.firstName} ${lead.lastName}`.trim() : null;
  const mapQuery = [lead.address, lead.city, lead.state].filter(Boolean).join(", ");
  const hasLocation = Boolean(lead.address || lead.city);

  return (
    <Screen title={displayName}>
      <div className="flex flex-col gap-5 p-4">
        {confirmingConvert ? (
          <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">¿Convertir a {displayName} en cliente?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingConvert(false)}
                className="flex-1 rounded-xl border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "#e4622c" }}
              >
                {convertMutation.isPending ? "Convirtiendo..." : "Sí, convertir"}
              </button>
            </div>
            {convertMutation.isError && (
              <p className="text-xs text-red-600">No se pudo convertir. Probá de nuevo.</p>
            )}
          </div>
        ) : (
          <button
            onClick={() => setConfirmingConvert(true)}
            className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white"
            style={{ background: "#e4622c" }}
          >
            <ArrowRightLeft className="h-4 w-4" strokeWidth={2} />
            Convertir en cliente
          </button>
        )}

        <section className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] text-neutral-400">
              L-{String(lead.leadNumber).padStart(4, "0")}
            </span>
            {lead.contacted ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Contactado
              </span>
            ) : (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                Sin contactar
              </span>
            )}
            {lead.sector && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                {sectorLabel(lead.sector)}
              </span>
            )}
          </div>
          <p className="text-lg font-semibold text-neutral-900">{displayName}</p>
          {subName && <p className="text-sm text-neutral-500">{subName}</p>}

          <div className="mt-2 flex flex-col gap-1.5 text-sm">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-neutral-700">
                <Phone className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.75} />
                {lead.phone}
              </a>
            )}
            {lead.whatsapp && (
              <a
                href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-neutral-700"
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-[#25d366]" strokeWidth={1.75} />
                {lead.whatsapp}
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-neutral-700">
                <span className="w-4 shrink-0 text-center text-neutral-400">@</span>
                {lead.email}
              </a>
            )}
            {(lead.address || lead.city || lead.state) && (
              <p className="flex items-start gap-2 text-neutral-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.75} />
                {[lead.address, lead.city, lead.state].filter(Boolean).join(", ")}
              </p>
            )}
            {lead.cuit && <p className="text-neutral-500">CUIT/RUT: {lead.cuit}</p>}
            {lead.assignedTo && <p className="text-neutral-500">Asignado a {lead.assignedTo.name}</p>}
          </div>

          {lead.notes && (
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
              {lead.notes}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Notas</h2>

          <div className="flex flex-col gap-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Agregar una nota..."
              rows={2}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base"
            />
            <button
              onClick={() => noteText.trim() && noteMutation.mutate(noteText.trim())}
              disabled={!noteText.trim() || noteMutation.isPending}
              className="self-end rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 disabled:opacity-50"
            >
              {noteMutation.isPending ? "Guardando..." : "Agregar nota"}
            </button>
          </div>

          {activities?.length === 0 && <p className="text-sm text-neutral-500">Todavía no hay notas.</p>}
          <div className="flex flex-col gap-2">
            {activities?.map((a) => (
              <div key={a.id} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-900">{a.title}</p>
                  <p className="shrink-0 text-[11px] text-neutral-400">{formatDate(a.createdAt)}</p>
                </div>
                {a.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{a.description}</p>
                )}
                {a.user && <p className="mt-1 text-[11px] text-neutral-400">{a.user.name}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Ubicación</h2>
          {hasLocation ? (
            <>
              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <iframe
                  title="Mapa"
                  className="h-48 w-full"
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
                />
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}&travelmode=driving`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700"
                >
                  <Navigation className="h-4 w-4" strokeWidth={1.75} />
                  Navegar
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center rounded-xl border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700"
                >
                  Abrir en Maps
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500">Sin dirección cargada.</p>
          )}
        </section>
      </div>
    </Screen>
  );
}
