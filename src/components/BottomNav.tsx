import { NavLink } from "react-router-dom";
import { FileText, Search, Wallet, Undo2, Bot, Mail, type LucideIcon } from "lucide-react";

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/ventas/nueva", label: "Vender", icon: FileText },
  { to: "/ventas", label: "Ventas", icon: Search },
  { to: "/pagos", label: "Pagos", icon: Wallet },
  { to: "/devolucion", label: "Devol.", icon: Undo2 },
  { to: "/asistente", label: "Agente", icon: Bot },
  { to: "/mail", label: "Mail", icon: Mail },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
              isActive ? "text-[#e4622c]" : "text-neutral-400"
            }`
          }
        >
          <item.icon className="h-5 w-5" strokeWidth={1.75} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
