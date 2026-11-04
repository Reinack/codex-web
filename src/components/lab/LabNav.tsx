"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { GkAge, GkIcon } from "@/lib/gamekit/GameKit";
import "./lab.css";

// Pestañas del Lab: ícono del árbol (edificio, unidad o edad) + nombre.
export const LAB_TABS = [
  { href: "/lab/builds", key: "lab.tab.builds", icon: "barracks" },
  { href: "/lab/timings", key: "lab.tab.timings", age: "imperial" },
  { href: "/lab/maps", key: "lab.tab.maps", icon: "outpost" },
  { href: "/lab/scouting", key: "lab.tab.scouting", icon: "scout" },
  { href: "/lab/team", key: "lab.tab.team", icon: "castle" },
  { href: "/lab/draft", key: "lab.tab.draft", icon: "tc" },
  { href: "/lab/sim", key: "lab.tab.sim", icon: "knight" },
  { href: "/lab/study", key: "lab.tab.study", icon: "university" },
] as const;

export function LabNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="lab-tabs" aria-label="Lab">
      {LAB_TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} className="lab-tab" aria-current={pathname === tab.href ? "page" : undefined}>
          {"icon" in tab ? <GkIcon id={tab.icon} size="s" className="no-gk" /> : <GkAge age={tab.age} />}
          {t(tab.key)}
        </Link>
      ))}
    </nav>
  );
}
