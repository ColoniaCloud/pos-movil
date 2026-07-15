import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { ApiError, createClient, searchClients } from "@/lib/api";
import type { Client } from "@/lib/types";

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
        placeholder="Buscar cliente por nombre o empresa..."
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
          <button
            key={client.id}
            onClick={() => onSelect(client)}
            className="flex w-full flex-col items-start px-1 py-3 text-left active:bg-neutral-100"
          >
            <span className="font-medium text-neutral-900">
              {client.company || `${client.firstName} ${client.lastName}`}
            </span>
            {client.company && (
              <span className="text-sm text-neutral-500">
                {client.firstName} {client.lastName}
              </span>
            )}
            {client.phone && <span className="text-sm text-neutral-500">{client.phone}</span>}
          </button>
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

  const mutation = useMutation({
    mutationFn: () =>
      createClient({
        firstName,
        lastName,
        company: company || undefined,
        phone: phone || undefined,
      }),
    onSuccess: onCreated,
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear el cliente"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
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
