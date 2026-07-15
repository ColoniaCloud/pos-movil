import { Construction } from "lucide-react";
import { Screen } from "@/components/Screen";

export function Devolucion() {
  return (
    <Screen title="Hacer devolución">
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <Construction className="h-12 w-12 text-neutral-400" strokeWidth={1.5} />
        <p className="text-lg font-semibold text-neutral-900">Próximamente</p>
        <p className="text-neutral-500">
          Esta función todavía está en desarrollo del lado del CRM. Cuando esté lista, vas a poder
          generar devoluciones desde acá.
        </p>
      </div>
    </Screen>
  );
}
