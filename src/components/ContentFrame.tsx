"use client";

import { usePathname } from "next/navigation";

// Vistas-herramienta (árbol, counters, producción, grafo) usan todo el ancho de la
// pantalla; el resto queda en una hoja centrada, más cómoda para leer.
const FULL_WIDTH = ["/tree", "/counters", "/production", "/graph"];
// El árbol ya trae su propio pergamino: va sin la hoja de papiro, para ganar lugar.
const BARE = ["/tree"];

const matches = (list: string[], pathname: string) =>
  list.some((p) => pathname === p || pathname.startsWith(p + "/"));

export function ContentFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const full = matches(FULL_WIDTH, pathname);
  if (matches(BARE, pathname)) {
    return <div className="w-full flex-1 px-2 pb-2 pt-2 sm:px-3">{children}</div>;
  }
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
