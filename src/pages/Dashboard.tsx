import { useNavigate } from "react-router-dom";
import { FileText, Search, Wallet, Undo2, Bot, Mail, UserPlus, Users, type LucideIcon } from "lucide-react";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";

const ACTIONS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/ventas/nueva", label: "Crear venta", icon: FileText },
  { to: "/ventas", label: "Consultar venta", icon: Search },
  { to: "/pagos", label: "Registrar pago", icon: Wallet },
  { to: "/devolucion", label: "Hacer devolución", icon: Undo2 },
  { to: "/leads/nuevo", label: "Registrar lead", icon: UserPlus },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/asistente", label: "Consultar agente", icon: Bot },
  { to: "/mail", label: "Mail", icon: Mail },
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-svh flex-col bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
        <img src="/kristall-logo.png" alt="Kristall Film" className="h-6" />
        <UserAvatarMenu />
      </header>

      <main className="grid flex-1 grid-cols-2 gap-4 p-4">
        {ACTIONS.map((a) => (
          <button
            key={a.to}
            onClick={() => navigate(a.to)}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm active:scale-[0.98] active:bg-neutral-50"
          >
            <a.icon strokeWidth={1.5} className="h-10 w-10" style={{ color: "#e4622c" }} />
            <span className="text-base font-semibold text-neutral-900">{a.label}</span>
          </button>
        ))}
      </main>
    </div>
  );
}
