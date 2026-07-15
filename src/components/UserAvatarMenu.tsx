import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function UserAvatarMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;
  const initial = user.name.trim().charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Cuenta"
        className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-transparent active:ring-neutral-200"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-sm font-semibold text-white"
            style={{ background: "#0a0a0a" }}
          >
            {initial}
          </div>
        )}
      </button>

      {open && (
        <>
          <button
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-neutral-200">
            <div className="border-b border-neutral-100 px-4 py-3">
              <p className="truncate text-sm font-semibold text-neutral-900">{user.name}</p>
              <p className="truncate text-xs text-neutral-500">{user.email}</p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/perfil");
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-neutral-700 active:bg-neutral-100"
            >
              <User className="h-4 w-4" strokeWidth={1.5} />
              Perfil
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/ajustes");
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-neutral-700 active:bg-neutral-100"
            >
              <Settings className="h-4 w-4" strokeWidth={1.5} />
              Ajustes
            </button>
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-3 border-t border-neutral-100 px-4 py-3 text-left text-sm font-medium text-red-600 active:bg-neutral-100"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              Salir
            </button>
          </div>
        </>
      )}
    </div>
  );
}
