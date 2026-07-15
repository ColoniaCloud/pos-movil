import { User } from "lucide-react";
import { Screen } from "@/components/Screen";

export function Perfil() {
  return (
    <Screen title="Perfil">
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <User className="h-12 w-12 text-neutral-400" strokeWidth={1.5} />
        <p className="text-lg font-semibold text-neutral-900">Próximamente</p>
        <p className="text-neutral-500">Todavía no se puede editar el perfil desde acá.</p>
      </div>
    </Screen>
  );
}
