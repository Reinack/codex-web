"use client";

// Error boundary global de la app (App Router). Captura errores de render en el
// servidor o el cliente y ofrece reintentar. El backend free-tier puede tardar
// en despertar (~50 s): reintentar suele bastar.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="max-w-md text-sm text-zinc-500">
        Puede que el backend esté despertando (cold start del free tier). Probá de nuevo
        en unos segundos.
      </p>
      <p className="max-w-md break-words text-xs text-zinc-400">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
      >
        Reintentar
      </button>
    </div>
  );
}
