import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-semibold">404</h1>
      <p className="text-sm text-zinc-500">No encontramos esta página.</p>
      <Link
        href="/"
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
