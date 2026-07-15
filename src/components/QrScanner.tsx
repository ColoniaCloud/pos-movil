import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { X } from "lucide-react";

export function QrScanner({ onScan, onClose }: { onScan: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let stopped = false;
    let controls: { stop: () => void } | undefined;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (result && !stopped) {
          stopped = true;
          controls?.stop();
          onScan(result.getText());
        }
      })
      .then((c) => {
        controls = c;
      })
      .catch(() => setError("No se pudo acceder a la cámara. Revisá los permisos."));

    return () => {
      stopped = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4">
        <p className="font-semibold text-white">Escanear código</p>
        <button onClick={onClose} className="text-white" aria-label="Cerrar">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="relative flex-1">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
      </div>
      {error && <p className="bg-black p-4 text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
