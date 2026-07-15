import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError, sendRemitoEmail } from "@/lib/api";

export function SendRemitoForm({
  saleId,
  defaultEmail,
  onSuccess,
}: {
  saleId: string;
  defaultEmail: string;
  onSuccess: (sentTo: string) => void;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => sendRemitoEmail(saleId, email || undefined),
    onSuccess: (result) => onSuccess(result.sentTo),
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo enviar el remito"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-neutral-50 p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Enviar a</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@cliente.com"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-lg py-2.5 font-semibold text-white active:opacity-90 disabled:opacity-60"
        style={{ background: "#e4622c" }}
      >
        {mutation.isPending ? "Enviando..." : "Enviar remito"}
      </button>
    </form>
  );
}
