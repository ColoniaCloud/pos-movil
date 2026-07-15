import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Send, Download, Compass, Megaphone } from "lucide-react";
import { Screen } from "@/components/Screen";
import { askAssistant, ApiError } from "@/lib/api";
import type { AssistantChatMessage } from "@/lib/types";

function downloadBase64File(filename: string, mimeType: string, contentBase64: string) {
  const byteChars = atob(contentBase64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ActionCard({ message }: { message: AssistantChatMessage }) {
  const action = message.action;
  if (!action) return null;

  if (action.type === "navigate") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600">
        <Compass className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        Sección relacionada: {action.label} (disponible en el CRM web)
      </div>
    );
  }

  if (action.type === "table") {
    return (
      <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-left text-xs">
          <caption className="bg-neutral-50 px-3 py-2 text-left font-semibold text-neutral-700">
            {action.title}
          </caption>
          <thead>
            <tr className="bg-neutral-50">
              {action.columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-3 py-2 font-medium text-neutral-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {action.rows.map((row, i) => (
              <tr key={i} className="border-t border-neutral-100">
                {action.columns.map((col) => (
                  <td key={col} className="whitespace-nowrap px-3 py-2 text-neutral-700">
                    {String(row[col] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (action.type === "campaign") {
    return (
      <div className="mt-2 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600">
        <div className="mb-1 flex items-center gap-2 font-semibold text-neutral-700">
          <Megaphone className="h-4 w-4" strokeWidth={1.5} />
          {action.label}
        </div>
        Para confirmar y lanzar el envío, completá esta acción desde el CRM web.
      </div>
    );
  }

  if (action.type === "file") {
    return (
      <button
        onClick={() => downloadBase64File(action.filename, action.mimeType, action.contentBase64)}
        className="mt-2 flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 active:bg-neutral-100"
      >
        <Download className="h-4 w-4" strokeWidth={1.5} />
        {action.label}
      </button>
    );
  }

  return null;
}

export function Asistente() {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    { role: "assistant", content: "Hola, soy el asistente de Dr Polarizados. Preguntame lo que necesites: clientes, ventas, stock, pagos, garantías y más." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setInput("");
    setSending(true);

    try {
      const response = await askAssistant(text, history);
      if (response.error) {
        setError(response.error);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: response.message, action: response.action }]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo consultar al asistente");
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen title="Consultar agente">
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user" ? "text-white" : "bg-white text-neutral-900 shadow-sm"
                }`}
                style={m.role === "user" ? { background: "#e4622c" } : undefined}
              >
                {m.role === "assistant" && (
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
                    <Bot className="h-3.5 w-3.5" strokeWidth={2} />
                    Asistente
                  </div>
                )}
                <p className="whitespace-pre-line">{m.content}</p>
                <ActionCard message={m} />
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-4 py-2.5 text-sm text-neutral-400 shadow-sm">Pensando...</div>
            </div>
          )}
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-neutral-200 bg-white p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Preguntale algo al asistente..."
            className="flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-base"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Enviar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
            style={{ background: "#e4622c" }}
          >
            <Send className="h-5 w-5" strokeWidth={2} />
          </button>
        </form>
      </div>
    </Screen>
  );
}
