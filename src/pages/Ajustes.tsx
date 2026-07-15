import { Settings } from "lucide-react";
import { Screen } from "@/components/Screen";

export function Ajustes() {
  return (
    <Screen title="Ajustes">
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <Settings className="h-12 w-12 text-neutral-400" strokeWidth={1.5} />
        <p className="text-lg font-semibold text-neutral-900">Próximamente</p>
        <p className="text-neutral-500">Todavía no hay ajustes configurables desde acá.</p>
      </div>
    </Screen>
  );
}
