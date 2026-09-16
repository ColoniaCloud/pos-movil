import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, MapPin, User } from "lucide-react";
import { Screen } from "@/components/Screen";
import { listLeads } from "@/lib/api";
import { sectorLabel } from "@/lib/sectors";
import type { LeadListItem } from "@/lib/types";

// Ciclo de 3 estados con un solo botón: Todos → Contactados → Sin contactar.
// Es el filtro que más se usa en la lista del CRM web (los chips "Todos /
// Contactados / No contactados" arriba de la tabla).
function nextContacted(current: boolean | null): boolean | null {
  if (current === null) return true;
  if (current === true) return false;
  return null;
}

function FilterChip({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof User;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium ${
        active
          ? "border-transparent text-white"
          : "border-neutral-300 text-neutral-600 active:bg-neutral-100"
      }`}
      style={active ? { background: "#e4622c" } : undefined}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      {label}
    </button>
  );
}

function ContactedBadge({ contacted }: { contacted: boolean }) {
  const base = "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold";
  return contacted ? (
    <span className={`${base} bg-emerald-100 text-emerald-700`}>Contactado</span>
  ) : (
    <span className={`${base} bg-neutral-100 text-neutral-500`}>Sin contactar</span>
  );
}

function LeadRow({ lead, onOpen }: { lead: LeadListItem; onOpen: (id: string) => void }) {
  const displayName = lead.company || `${lead.firstName} ${lead.lastName}`.trim();
  const subName = lead.company ? `${lead.firstName} ${lead.lastName}`.trim() : null;
  return (
    <button
      onClick={() => onOpen(lead.id)}
      className="flex w-full items-start gap-2 px-1 py-3 text-left active:bg-neutral-100"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-neutral-900">
          <span className="mr-1.5 font-mono text-[10px] text-neutral-400">
            L-{String(lead.leadNumber).padStart(4, "0")}
          </span>
          {displayName}
        </p>
        {subName && <p className="truncate text-sm text-neutral-500">{subName}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <ContactedBadge contacted={lead.contacted} />
          {lead.sector && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
              {sectorLabel(lead.sector)}
            </span>
          )}
          {lead.city && <span className="text-xs text-neutral-500">{lead.city}</span>}
        </div>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
    </button>
  );
}

export function Leads() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [contacted, setContacted] = useState<boolean | null>(null);
  const [myLeads, setMyLeads] = useState(false);
  const [hasAddress, setHasAddress] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: leads, isFetching, error } = useQuery({
    queryKey: ["leads", debounced, contacted, myLeads, hasAddress],
    queryFn: () =>
      listLeads({
        search: debounced || undefined,
        contacted: contacted ?? undefined,
        myLeads: myLeads || undefined,
        hasAddress: hasAddress || undefined,
      }),
  });

  return (
    <Screen title="Leads">
      <div className="flex flex-col gap-3 p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar lead..."
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base"
        />

        <div className="flex gap-2">
          <FilterChip
            active={contacted !== null}
            onClick={() => setContacted(nextContacted)}
            icon={CheckCircle2}
            label={contacted === null ? "Todos" : contacted ? "Contactados" : "Sin contactar"}
          />
          <FilterChip active={myLeads} onClick={() => setMyLeads((v) => !v)} icon={User} label="Mis leads" />
          <FilterChip
            active={hasAddress}
            onClick={() => setHasAddress((v) => !v)}
            icon={MapPin}
            label="Con dirección"
          />
        </div>

        {error && <p className="py-4 text-center text-red-600">No se pudieron cargar los leads</p>}
        {isFetching && <p className="py-4 text-center text-neutral-500">Buscando...</p>}
        {!isFetching && leads?.length === 0 && (
          <p className="py-4 text-center text-neutral-500">Sin resultados</p>
        )}

        <div className="divide-y divide-neutral-200">
          {leads?.map((lead) => (
            <LeadRow key={lead.id} lead={lead} onOpen={(id) => navigate(`/leads/${id}`)} />
          ))}
        </div>
      </div>
    </Screen>
  );
}
