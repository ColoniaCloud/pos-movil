import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function recentlyDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const days = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
  return days < DISMISS_DAYS;
}

// Muestra una invitación a instalar la PWA (pantalla de inicio) en cualquier
// pantalla, logueado o no — el login también se beneficia de acceso rápido.
export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    if (isIos()) {
      setShowIosHint(true);
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferredPrompt(null);
      setDismissed(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
    setShowIosHint(false);
    setDeferredPrompt(null);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome !== "accepted") localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDeferredPrompt(null);
  }

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div
      className="fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex w-full max-w-sm items-start gap-3 rounded-2xl bg-neutral-900 p-4 text-white shadow-xl">
        <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Instalá POS Kristall</p>
          {showIosHint ? (
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-300">
              Tocá <Share className="inline h-3.5 w-3.5 align-text-bottom" strokeWidth={1.75} /> y
              luego "Agregar a inicio" para usarla como app.
            </p>
          ) : (
            <>
              <p className="mt-0.5 text-xs text-neutral-300">
                Agregala a tu pantalla de inicio para acceder más rápido, incluso sin conexión.
              </p>
              <button
                onClick={install}
                className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white active:opacity-90"
                style={{ background: "#e4622c" }}
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                Instalar
              </button>
            </>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="-m-1 shrink-0 p-1 text-neutral-400 active:text-neutral-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
