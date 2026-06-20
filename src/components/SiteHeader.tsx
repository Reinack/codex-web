"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlobalSearch } from "./GlobalSearch";

const NAV = [
  { href: "/civs", label: "Civs" },
  { href: "/tree", label: "Árbol" },
  { href: "/counters", label: "Counters" },
  { href: "/matchups", label: "Matchups" },
  { href: "/graph", label: "Grafo" },
  { href: "/chat", label: "Chat" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-amber-900/10 bg-zinc-50/80 backdrop-blur dark:border-amber-200/10 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
          aoe2 · <span className="text-amber-600 dark:text-amber-400">codex</span>
        </Link>
        <nav className="order-3 flex flex-wrap gap-1 text-sm sm:order-2">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  active
                    ? "bg-amber-500/15 font-medium text-amber-700 dark:text-amber-300"
                    : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="order-2 ml-auto sm:order-3">
          <GlobalSearch />
        </div>
      </div>
    </header>
  );
}
