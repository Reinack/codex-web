"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCatalog, fetchCatalogCounts } from "@/lib/api/explore-client";
import type { CatalogItem } from "@/lib/api/schema";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";
import { CATEGORIES } from "@/components/GraphCatalog";
import { catalogLabel, compareGroupKeys, groupKey, splitGroup } from "@/lib/graph/catalog";

// Categoría de una nota a partir de su path ("units/archery/archer.md" → units). El
// grupo no sale del path (es el `catalogo` de la wiki): lo resuelve CategoryNode
// cuando carga las notas de la categoría.
function locate(path: string): { cat: string | null } {
  const parts = path.split("/");
  return { cat: parts.length < 2 ? null : parts[0] };
}

function toggled(set: Set<string>, key: string): Set<string> {
  const n = new Set(set);
  if (n.has(key)) n.delete(key);
  else n.add(key);
  return n;
}

// Catálogo vertical para el panel izquierdo del grafo: categoría → grupo → nota.
export function GraphCatalogTree({
  current,
  onPick,
}: {
  current: string;
  onPick: (path: string) => void;
}) {
  const t = useT();
  const where = locate(current);
  const [openCats, setOpenCats] = useState<Set<string>>(
    () => new Set(where.cat ? [where.cat] : []),
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const [q, setQ] = useState("");

  // Si el centro cambia (doble click en el grafo, back del navegador) el árbol
  // abre la rama donde cayó, sin cerrar lo que el usuario ya tenía abierto.
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    setSeen(current);
    if (where.cat) setOpenCats((s) => new Set(s).add(where.cat!));
  }

  const countsQ = useQuery({ queryKey: ["catalog-counts"], queryFn: fetchCatalogCounts });
  const counts = useMemo(
    () => new Map(countsQ.data?.map((c) => [c.type, c.count]) ?? []),
    [countsQ.data],
  );

  return (
    <nav aria-label={t("graph.catalog")} className="flex min-h-0 flex-1 flex-col gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("graph.filter")}
        className="field w-full min-w-0 px-2.5 py-1.5 text-sm"
      />
      <ul className="min-h-0 flex-1 overflow-auto pr-1">
        {CATEGORIES.map((c) => (
          <CategoryNode
            key={c}
            type={c}
            label={t(`cat.${c}`)}
            count={counts.get(c)}
            open={openCats.has(c)}
            onToggle={() => setOpenCats((s) => toggled(s, c))}
            openGroups={openGroups}
            onToggleGroup={(g) => setOpenGroups((s) => toggled(s, `${c}/${g}`))}
            onOpenGroup={(g) => setOpenGroups((s) => (s.has(`${c}/${g}`) ? s : new Set(s).add(`${c}/${g}`)))}
            current={current}
            q={q.trim().toLowerCase()}
            onPick={onPick}
          />
        ))}
      </ul>
    </nav>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block w-3 shrink-0 text-[10px] text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`}
    >
      ▶
    </span>
  );
}

function CategoryNode({
  type,
  label,
  count,
  open,
  onToggle,
  openGroups,
  onToggleGroup,
  onOpenGroup,
  current,
  q,
  onPick,
}: {
  type: string;
  label: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  openGroups: Set<string>;
  onToggleGroup: (group: string) => void;
  onOpenGroup: (group: string) => void;
  current: string;
  q: string;
  onPick: (path: string) => void;
}) {
  const { t, locale } = useI18n();
  const itemsQ = useQuery({
    queryKey: ["catalog", type],
    queryFn: () => fetchCatalog(type),
    enabled: open,
  });

  const groups = useMemo(() => {
    const items = (itemsQ.data ?? []).filter(
      (it) =>
        !q ||
        it.title.toLowerCase().includes(q) ||
        (it.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
    );
    const map = new Map<string, CatalogItem[]>();
    for (const it of [...items].sort((a, b) => a.title.localeCompare(b.title))) {
      const k = groupKey(it.group);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return [...map.entries()].sort((a, b) => compareGroupKeys(a[0], b[0]));
  }, [itemsQ.data, q]);

  // Abre el grupo de la nota que está en el centro del grafo (una vez por nota).
  const currentKey = useMemo(() => {
    const it = itemsQ.data?.find((i) => i.path === current);
    return it ? groupKey(it.group) : null;
  }, [itemsQ.data, current]);
  useEffect(() => {
    if (currentKey) onOpenGroup(currentKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  return (
    <li className="border-b border-[var(--rule)] last:border-b-0">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-1 py-1.5 text-left font-display text-[13px] font-bold tracking-[0.03em] hover:text-[var(--red-500)]"
      >
        <Chevron open={open} />
        <span className="flex-1">{label}</span>
        {count !== undefined && <span className="text-[11px] font-normal text-zinc-500">{count}</span>}
      </button>

      {open &&
        (itemsQ.isError ? (
          <p className="px-5 pb-2 text-xs text-rose-700">{t("graph.catalogError")}</p>
        ) : itemsQ.isLoading ? (
          <div className="mx-5 mb-2 h-16 animate-pulse bg-[rgba(138,24,18,0.08)]" />
        ) : (
          <ul className="pb-1.5 pl-3">
            {groups.map(([g, items], i) => {
              const { section, group } = splitGroup(g);
              const prev = i > 0 ? splitGroup(groups[i - 1][0]).section : null;
              return (
              <Fragment key={g}>
              {/* Sección del navbox (Genéricas, Únicas…) cuando cambia */}
              {section && section !== prev && (
                <li className="px-1 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500">
                  {catalogLabel(section, locale)}
                </li>
              )}
              <GroupNode
                label={catalogLabel(group, locale)}
                items={items}
                open={openGroups.has(`${type}/${g}`) || !!q}
                onToggle={() => onToggleGroup(g)}
                current={current}
                onPick={onPick}
              />
              </Fragment>
              );
            })}
          </ul>
        ))}
    </li>
  );
}

function GroupNode({
  label,
  items,
  open,
  onToggle,
  current,
  onPick,
}: {
  label: string;
  items: CatalogItem[];
  open: boolean;
  onToggle: () => void;
  current: string;
  onPick: (path: string) => void;
}) {
  return (
    <li>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-1 py-1 text-left text-[13px] font-semibold hover:text-[var(--red-500)]"
      >
        <Chevron open={open} />
        <span className="flex-1 truncate">{label}</span>
        <span className="text-[11px] font-normal text-zinc-500">{items.length}</span>
      </button>
      {open && (
        <ul className="pl-5">
          {items.map((it) => (
            <ItemRow key={it.path} item={it} active={it.path === current} onPick={onPick} />
          ))}
        </ul>
      )}
    </li>
  );
}

function ItemRow({
  item,
  active,
  onPick,
}: {
  item: CatalogItem;
  active: boolean;
  onPick: (path: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return (
    <li>
      <button
        ref={ref}
        onClick={() => onPick(item.path)}
        title={item.aliases?.join(" · ") || undefined}
        aria-current={active || undefined}
        className={`flex w-full items-center gap-2 px-1.5 py-1 text-left text-[13px] ${
          active
            ? "bg-[rgba(138,24,18,0.14)] font-bold text-[var(--red-500)]"
            : "hover:bg-[rgba(138,24,18,0.08)] hover:text-[var(--red-500)]"
        }`}
      >
        <span className="flex-1 truncate">{item.title}</span>
        <span className="shrink-0 text-[11px] text-zinc-500">{item.degree}</span>
      </button>
    </li>
  );
}
