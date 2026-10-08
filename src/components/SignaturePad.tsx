import { useEffect, useRef, useState, type PointerEvent } from "react";

/**
 * El recuadro donde firma el cliente, con el dedo. Sin dependencias.
 *
 * Gemelo de `crm-polarizados/src/components/signature-pad.tsx` (los repos no
 * comparten código). Lo que importa que coincida: el canvas de 1000×400, que es
 * la proporción de la caja de la firma en el PDF del remito.
 *
 * `touch-none` para que firmar no haga scroll de la pantalla. Un toque suelto no
 * cuenta como firma: hace falta recorrer MIN_LENGTH (unidades del canvas). Por
 * distancia y no por cantidad de eventos, porque un trazo rápido en un celular
 * lento manda pocos eventos largos.
 */

const W = 1000;
const H = 400;
const MIN_LENGTH = 120;

export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const length = useRef(0);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0A0A0A";
  }, []);

  function pos(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  }

  function down(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  }

  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    length.current += Math.hypot(p.x - last.current.x, p.y - last.current.y);
    last.current = p;
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (length.current >= MIN_LENGTH && canvasRef.current) {
      setEmpty(false);
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }

  function clear() {
    canvasRef.current?.getContext("2d")?.clearRect(0, 0, W, H);
    length.current = 0;
    setEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <div className="relative rounded-xl border-2 border-dashed border-neutral-300 bg-white">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block aspect-[5/2] w-full touch-none select-none"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
          aria-label="Recuadro para firmar"
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-neutral-400">
            Firmá acá con el dedo
          </span>
        )}
        <div className="pointer-events-none absolute bottom-[22%] left-[6%] right-[6%] h-px bg-neutral-200" />
      </div>
      <div className="flex justify-end pt-1.5">
        <button type="button" onClick={clear} disabled={empty} className="text-sm text-neutral-500 underline disabled:opacity-40">
          Borrar
        </button>
      </div>
    </div>
  );
}
