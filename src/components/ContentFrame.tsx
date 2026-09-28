"use client";

import { usePathname } from "next/navigation";

// Vistas-herramienta (árbol, counters, producción, grafo) usan todo el ancho de la
// pantalla; el resto queda en una hoja centrada, más cómoda para leer.
const FULL_WIDTH = ["/tree", "/counters", "/production", "/graph"];

export function ContentFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const full = FULL_WIDTH.some((p) => pathname === p || pathname.startsWith(p + "/"));
  return (
    <div
      className={`mx-auto w-full flex-1 px-3 pb-10 pt-5 sm:px-4 ${
        full ? "max-w-none 2xl:px-8" : "max-w-5xl xl:max-w-6xl 2xl:max-w-7xl"
      }`}
    >
      <div className="sheet px-4 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  );
}
