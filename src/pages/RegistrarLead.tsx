import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Screen } from "@/components/Screen";
import { ApiError, createLead } from "@/lib/api";
import { SECTORS } from "@/lib/sectors";
import type { Client, ContactType } from "@/lib/types";

type ContactForm = {
  firstName: string;
  lastName: string;
  company: string;
  sector: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  cuit: string;
  notes: string;
};

type DiagnosticForm = {
  monthlyCarVolume: string;
  filmBrandsUsed: string;
  currentSuppliers: string;
  rollPurchasePrices: string;
  improvementNeeds: string;
  logisticsIssues: string;
};

// El backend las junta en una sola nota (LeadActivity NOTE) en la ficha del lead.
const DIAGNOSTIC_FIELDS: { key: keyof DiagnosticForm; label: string }[] = [
  { key: "monthlyCarVolume", label: "Autos por mes" },
  { key: "filmBrandsUsed", label: "Marcas de láminas que usa" },
  { key: "currentSuppliers", label: "Proveedores que tiene" },
  { key: "rollPurchasePrices", label: "Precios de compra de sus rollos" },
  { key: "improvementNeeds", label: "Qué necesita para mejorar" },
  { key: "logisticsIssues", label: "Qué errores hay en la logística actual de sus proveedores" },
];

const EMPTY_CONTACT: ContactForm = {
  firstName: "",
  lastName: "",
  company: "",
  sector: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  city: "",
  state: "",
  cuit: "",
  notes: "",
};

const EMPTY_DIAGNOSTIC: DiagnosticForm = {
  monthlyCarVolume: "",
  filmBrandsUsed: "",
  currentSuppliers: "",
  rollPurchasePrices: "",
  improvementNeeds: "",
  logisticsIssues: "",
};

const inputClass = "w-full rounded-xl border border-neutral-300 px-4 py-3 text-base";

function TypeBadge({ type }: { type: ContactType }) {
  const base = "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";
  if (type === "INSTALLER") return <span className={`${base} bg-indigo-100 text-indigo-700`}>Instalador</span>;
  if (type === "LEAD") return <span className={`${base} bg-amber-100 text-amber-700`}>Lead</span>;
  return <span className={`${base} bg-neutral-100 text-neutral-500`}>Cliente</span>;
}

export function RegistrarLead() {
  const navigate = useNavigate();
  const [contact, setContact] = useState<ContactForm>(EMPTY_CONTACT);
  const [diagnostic, setDiagnostic] = useState<DiagnosticForm>(EMPTY_DIAGNOSTIC);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Client[] | null>(null);
  const [created, setCreated] = useState<Client | null>(null);

  function updateContact<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setContact((prev) => ({ ...prev, [key]: value }));
  }
  function updateDiagnostic<K extends keyof DiagnosticForm>(key: K, value: DiagnosticForm[K]) {
    setDiagnostic((prev) => ({ ...prev, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: (force: boolean) =>
      createLead({
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company || undefined,
        sector: contact.sector || undefined,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        whatsapp: contact.whatsapp || undefined,
        address: contact.address || undefined,
        city: contact.city || undefined,
        state: contact.state || undefined,
        cuit: contact.cuit || undefined,
        notes: contact.notes || undefined,
        monthlyCarVolume: diagnostic.monthlyCarVolume || undefined,
        filmBrandsUsed: diagnostic.filmBrandsUsed || undefined,
        currentSuppliers: diagnostic.currentSuppliers || undefined,
        rollPurchasePrices: diagnostic.rollPurchasePrices || undefined,
        improvementNeeds: diagnostic.improvementNeeds || undefined,
        logisticsIssues: diagnostic.logisticsIssues || undefined,
        force: force || undefined,
      }),
    onSuccess: (lead) => {
      setDuplicates(null);
      setCreated(lead);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        const posibles = (err.body as { duplicates?: Client[] } | undefined)?.duplicates;
        if (posibles?.length) {
          setDuplicates(posibles);
          return;
        }
      }
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el lead");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate(false);
  }

  function resetForm() {
    setContact(EMPTY_CONTACT);
    setDiagnostic(EMPTY_DIAGNOSTIC);
    setError(null);
    setDuplicates(null);
    setCreated(null);
  }

  if (created) {
    const name = created.company || `${created.firstName} ${created.lastName}`.trim();
    return (
      <Screen title="Lead registrado" onBack={null}>
        <div className="flex flex-col items-center gap-4 p-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-600" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-neutral-900">{name}</p>
          <p className="text-neutral-500">Se guardó como lead en el CRM.</p>
          <div className="mt-4 flex w-full max-w-xs flex-col gap-2">
            <button
              onClick={resetForm}
              className="rounded-xl py-3 font-semibold text-white"
              style={{ background: "#e4622c" }}
            >
              Cargar otro lead
            </button>
            <button
              onClick={() => navigate("/")}
              className="rounded-xl border border-neutral-300 py-3 font-semibold text-neutral-700"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  if (duplicates) {
    return (
      <Screen title="Registrar lead" onBack={() => setDuplicates(null)}>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} />
            <span>
              {duplicates.length === 1 ? "Ya existe un contacto" : `Ya existen ${duplicates.length} contactos`} que
              coincide{duplicates.length === 1 ? "" : "n"}. Revisá si es el mismo antes de crear otro.
            </span>
          </div>

          <div className="divide-y divide-neutral-200 rounded-xl bg-white px-3 shadow-sm">
            {duplicates.map((d) => (
              <div key={d.id} className="flex flex-col items-start gap-1 py-3">
                <span className="flex w-full items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium text-neutral-900">
                    {d.company || `${d.firstName} ${d.lastName}`}
                  </span>
                  <TypeBadge type={d.type} />
                </span>
                {d.phone && <span className="text-sm text-neutral-500">{d.phone}</span>}
              </div>
            ))}
          </div>

          <div className="mt-auto flex gap-2">
            <button
              type="button"
              onClick={() => setDuplicates(null)}
              className="flex-1 rounded-xl border border-neutral-300 py-3 font-semibold text-neutral-700"
            >
              Volver
            </button>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => {
                setError(null);
                mutation.mutate(true);
              }}
              className="flex-1 rounded-xl border border-neutral-300 py-3 font-semibold text-neutral-700 disabled:opacity-60"
            >
              {mutation.isPending ? "Creando..." : "Crear igual"}
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Registrar lead">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-4">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Datos del contacto</h2>
          <input
            autoFocus
            required
            value={contact.firstName}
            onChange={(e) => updateContact("firstName", e.target.value)}
            placeholder="Nombre"
            className={inputClass}
          />
          <input
            required
            value={contact.lastName}
            onChange={(e) => updateContact("lastName", e.target.value)}
            placeholder="Apellido"
            className={inputClass}
          />
          <input
            value={contact.company}
            onChange={(e) => updateContact("company", e.target.value)}
            placeholder="Empresa (opcional)"
            className={inputClass}
          />
          <select
            value={contact.sector}
            onChange={(e) => updateContact("sector", e.target.value)}
            className={`${inputClass} text-neutral-900`}
          >
            <option value="">Sector (opcional)</option>
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={contact.phone}
            onChange={(e) => updateContact("phone", e.target.value)}
            placeholder="Teléfono"
            className={inputClass}
          />
          <input
            type="tel"
            value={contact.whatsapp}
            onChange={(e) => updateContact("whatsapp", e.target.value)}
            placeholder="WhatsApp"
            className={inputClass}
          />
          <input
            type="email"
            value={contact.email}
            onChange={(e) => updateContact("email", e.target.value)}
            placeholder="Email"
            className={inputClass}
          />
          <input
            value={contact.address}
            onChange={(e) => updateContact("address", e.target.value)}
            placeholder="Dirección"
            className={inputClass}
          />
          <input
            value={contact.city}
            onChange={(e) => updateContact("city", e.target.value)}
            placeholder="Ciudad"
            className={inputClass}
          />
          <input
            value={contact.state}
            onChange={(e) => updateContact("state", e.target.value)}
            placeholder="Provincia / Departamento"
            className={inputClass}
          />
          <input
            value={contact.cuit}
            onChange={(e) => updateContact("cuit", e.target.value)}
            placeholder="CUIT / RUT (opcional)"
            className={inputClass}
          />
          <textarea
            value={contact.notes}
            onChange={(e) => updateContact("notes", e.target.value)}
            placeholder="Notas generales (opcional)"
            rows={3}
            className={inputClass}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Diagnóstico comercial</h2>
          <p className="text-sm text-neutral-500">
            Se guarda como una nota en la ficha del lead. Todas las respuestas son opcionales.
          </p>
          {DIAGNOSTIC_FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">{f.label}</span>
              <textarea
                value={diagnostic[f.key]}
                onChange={(e) => updateDiagnostic(f.key, e.target.value)}
                rows={2}
                className={inputClass}
              />
            </label>
          ))}
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-xl py-3 font-semibold text-white disabled:opacity-60"
          style={{ background: "#e4622c" }}
        >
          {mutation.isPending ? "Guardando..." : "Registrar lead"}
        </button>
      </form>
    </Screen>
  );
}
