// Mismas 6 opciones que el diálogo de "Nuevo lead" del CRM web
// (src/lib/design-tokens.ts: SECTOR_COLORS) — se repiten acá porque no hay
// un endpoint que las liste.
export const SECTORS: { value: string; label: string }[] = [
  { value: "AUTO_TALLER", label: "Auto - Taller" },
  { value: "AUTO_CONCESIONARIO", label: "Auto - Concesionario" },
  { value: "AUTO_MAYORISTA", label: "Auto - Mayorista" },
  { value: "ARQUITECTURA_CONSTRUCTORA", label: "Arquitectura - Constructora" },
  { value: "ARQUITECTURA_VIDRIERIA", label: "Arquitectura - Vidriería" },
  { value: "ARQUITECTURA_MAYORISTA", label: "Arquitectura - Mayorista" },
];

export function sectorLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return SECTORS.find((s) => s.value === value)?.label ?? value;
}
