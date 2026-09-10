import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { UserPlus, AlertTriangle } from "lucide-react";
import { ApiError, createClient, searchClients } from "@/lib/api";
import type { Client, ContactType } from "@/lib/types";

/**
 * El tipo a la vista es lo que le permite al vendedor desambiguar el desorden
 * que ya existe: para un mismo taller pueden convivir el INSTALLER real y el
 * CLIENT duplicado que la app lo obligó a crear cuando el buscador no mostraba
 * instaladores. Sin la etiqueta, elegir bien es adivinar.
 */
function TypeBadge({ type }: { type: ContactType }) {
  const base = "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";
  if (type === "INSTALLER")
    return <span className={`${base} bg-indigo-100 text-indigo-700`}>Instalador</span>;
  if (type === "LEAD") return <span className={`${base} bg-amber-100 text-amber-700`}>Lead</span>;
  return <span className={`${base} bg-neutral-100 text-neutral-500`}>Cliente</span>;
}

function ClientRow({ client, onSelect }: { client: Client; onSelect: (c: Client) => void }) {
  return (
    <button
      onClick={() => onSelect(client)}
      className="flex w-full flex-col items-start gap-1 px-1 py-3 text-left active:bg-neutral-100"
    >
      <span className="flex w-full items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-medium text-neutral-900">
          {client.company || `${client.firstName} ${client.lastName}`}
        </span>
        <TypeBadge type={client.type} />
      </span>
      {client.company && (
        <span className="text-sm text-neutral-500">
          {client.firstName} {client.lastName}
        </span>
      )}
      {client.phone && <span className="text-sm text-neutral-500">{client.phone}</span>}
    </button>
  );
}

export function ClientStep({ onSelect }: { onSelect: (client: Client) => void }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: clients, isFetching } = useQuery({
    queryKey: ["clients-search", debounced],
    queryFn: () => searchClients(debounced),
  });

  if (creating) {
    return <NewClientForm onCreated={onSelect} onCancel={() => setCreating(false)} />;
  }

  return (
    <div className="flex flex-1 flex-col p-4">
      <input
        autoFocus
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar cliente o instalador..."
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base"
      />

      <button
        onClick={() => setCreating(true)}
        className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 py-3 text-sm font-semibold text-neutral-700 active:bg-neutral-100"
      >
        <UserPlus className="h-4 w-4" strokeWidth={2} />
        Crear cliente nuevo
      </button>

      <div className="mt-3 flex-1 divide-y divide-neutral-200 overflow-y-auto">
        {isFetching && <p className="py-4 text-center text-neutral-500">Buscando...</p>}
        {!isFetching && clients?.length === 0 && (
          <p className="py-4 text-center text-neutral-500">Sin resultados</p>
        )}
        {clients?.map((client) => (
          <ClientRow key={client.id} client={client} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function NewClientForm({
  onCreated,
  onCancel,
}: {
  onCreated: (client: Client) => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Coincidencias que devolvió el CRM en un 409, antes de crear nada.
  const [duplicates, setDuplicates] = useState<Client[] | null>(null);

  const mutation = useMutation({
    mutationFn: (force: boolean) =>
      createClient({
        firstName,
        lastName,
        company: company || undefined,
        phone: phone || undefined,
        force: force || undefined,
      }),
    onSuccess: onCreated,
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        const posibles = (err.body as { duplicates?: Client[] } | undefined)?.duplicates;
        if (posibles?.length) {
          setDuplicates(posibles);
          return;
        }
      }
      setError(err instanceof ApiError ? err.message : "No se pudo crear el cliente");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate(false);
  }

  // El vendedor está por duplicar un contacto que ya existe. Se le ofrecen los
  // que coinciden para que use uno, en vez de dejarlo crear a ciegas: un
  // duplicado le parte la cuenta corriente al taller y le manda el rollo de
  // garantía a un contacto fantasma.
  if (duplicates) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} />
          <span>
            {duplicates.length === 1 ? "Ya existe un contacto" : `Ya existen ${duplicates.length} contactos`} que
            coincide{duplicates.length === 1 ? "" : "n"}. Si es el mismo, usalo en vez de crear otro.
          </span>
        </div>

        <div className="divide-y divide-neutral-200 rounded-xl bg-white px-3 shadow-sm">
          {duplicates.map((client) => (
            <ClientRow key={client.id} client={client} onSelect={onCreated} />
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
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3 p-4">
      <input
        autoFocus
        required
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="Nombre"
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base"
      />
      <input
        required
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Apellido"
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base"
      />
      <input
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder="Empresa (opcional)"
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Teléfono (opcional)"
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-sm text-neutral-500">
        Se crea como cliente. Si el taller es instalador, avisá en la oficina para reclasificarlo.
      </p>

      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-neutral-300 py-3 font-semibold text-neutral-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex-1 rounded-xl py-3 font-semibold text-white disabled:opacity-60"
          style={{ background: "#e4622c" }}
        >
          {mutation.isPending ? "Creando..." : "Crear cliente"}
        </button>
      </div>
    </form>
  );
}
