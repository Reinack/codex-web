"use client";

// Secciones del Lab dentro de Matchups: diferencias de árbol entre las dos civs (/api/lab/compare) y atajos al Lab
// (draft contra el rival, scouting, simulador y la guía del mapa).
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { labGet } from "@/lib/lab/api";
import { GkIcon } from "@/lib/gamekit/GameKit";
import { useLocalState } from "./ui";
import "./lab.css";

interface DiffItem { id: string; name: string; kind: string }
interface Compare { onlyA: DiffItem[]; onlyB: DiffItem[]; shared: number; a: { name: string }; b: { name: string } }

function DiffList({ items }: { items: DiffItem[] }) {
  return (
    <div className="cmp-diff">
      {items.length ? items.map((x) => (
        <div key={x.id}><GkIcon id={x.id} size="s" />{x.name} <span className="lab-small">{x.kind === "tech" ? "tech" : x.kind === "unit" ? "unidad" : "edificio"}</span></div>
      )) : "—"}
    </div>
  );
}

export function MatchupTreeDiff({ meSlug, vsSlug, meTitle, vsTitle }: { meSlug: string; vsSlug: string; meTitle: string; vsTitle: string }) {
  const q = useQuery({ queryKey: ["lab", "compare", meSlug, vsSlug], queryFn: () => labGet<Compare>("compare", { a: meSlug, b: vsSlug }), staleTime: Infinity });
  if (!q.data) return null;
  const d = q.data;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="lab-panel"><h3 className="lab-h3">Solo {meTitle} ({d.onlyA.length})</h3><DiffList items={d.onlyA} /></div>
      <div className="lab-panel"><h3 className="lab-h3">Solo {vsTitle} ({d.onlyB.length})</h3><DiffList items={d.onlyB} /></div>
      <p className="lab-small md:col-span-2">Árbol: solo lo que difiere (sin únicas ni lo que ambas comparten); comparten {d.shared} elementos.</p>
    </div>
  );
}

export function MatchupLabLinks({ vsSlug, vsTitle, mapName }: { vsSlug: string; vsTitle: string; mapName?: string }) {
  const [, setRivals] = useLocalState<string[]>("dv-vs", []);
  return (
    <div className="lab-row">
      <Link href="/lab/draft" className="lab-btn" onClick={() => setRivals([vsSlug])}>⚖️ Draft contra {vsTitle}</Link>
      <Link href="/lab/scouting" className="lab-btn">🔭 Scouting: qué mirar y cómo responder</Link>
      <Link href="/lab/sim" className="lab-btn">🧪 Simular</Link>
      {mapName ? <Link href="/lab/maps" className="lab-btn">🗺️ Guías de mapas</Link> : null}
    </div>
  );
}
