import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BottomNav } from "./BottomNav";

export function Screen({
  title,
  children,
  onBack,
  action,
}: {
  title: string;
  children: ReactNode;
  onBack?: (() => void) | null;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex h-svh flex-col bg-neutral-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
        {onBack !== null && (
          <button
            onClick={onBack ?? (() => navigate(-1))}
            aria-label="Volver"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full active:bg-neutral-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="flex-1 truncate text-lg font-semibold text-neutral-900">{title}</h1>
        {action}
      </header>
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
