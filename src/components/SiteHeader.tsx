import Link from "next/link";

const NAV = [
  { href: "/civs", label: "Civilizaciones" },
  { href: "/counters", label: "Counters" },
  { href: "/chat", label: "Chat" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
          aoe2 · <span className="text-amber-600 dark:text-amber-400">codex</span>
        </Link>
        <nav className="flex gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
