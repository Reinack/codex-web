"use client";

// Piezas compartidas del Lab: estado persistente, selector de civs, texto con negritas e íconos.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { labGet } from "@/lib/lab/api";
import { GkEmblem, GkText } from "@/lib/gamekit/GameKit";

export interface TeamCiv {
  slug: string; name: string; position: "flank" | "pocket" | "flex"; specialty: string; teamBonus: string;
}

/** Estado que se recuerda en localStorage (clave `lab:<key>`). Arranca con `initial` y carga lo guardado al montar. */
export function useLocalState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`lab:${key}`);
      if (raw !== null) setValue(JSON.parse(raw) as T); // eslint-disable-line react-hooks/set-state-in-effect
    } catch { /* storage bloqueado */ }
  }, [key]);
  const set = useCallback((v: T | ((p: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(`lab:${key}`, JSON.stringify(next)); } catch { /* storage bloqueado */ }
      return next;
    });
  }, [key]);
  return [value, set];
}

export function useTeamCivs() {
  const q = useQuery({ queryKey: ["lab", "team-civs"], queryFn: () => labGet<TeamCiv[]>("team-civs"), staleTime: Infinity });
  const civs = q.data ?? [];
  const name = (slug: string) => civs.find((c) => c.slug === slug)?.name ?? slug;
  return { civs, name, loading: q.isLoading };
}

export function Panel({ title, children, className = "" }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`lab-panel ${className}`}>
      {title ? <h3 className="lab-h3">{title}</h3> : null}
      {children}
    </section>
  );
}

export const Field = ({ label, children, grow }: { label: string; children: ReactNode; grow?: boolean }) => (
  <label className="lab-field" style={grow ? { flex: "1 1 280px" } : undefined}>{label}{children}</label>
);

/** Texto con **negritas** y los íconos de unidades/techs/edificios. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}><GkText>{part}</GkText></b> : <GkText key={i}>{part}</GkText>))}
    </>
  );
}

/** Selector de varias civs: lista desplegable + chips con emblema. */
export function CivPicker({ value, onChange, max = 4, placeholder = "Agregar civ…" }: {
  value: string[]; onChange: (v: string[]) => void; max?: number; placeholder?: string;
}) {
  const { civs, name } = useTeamCivs();
  return (
    <div>
      <div>
        {value.map((s) => (
          <span key={s} className="lab-chip">
            <GkEmblem slug={s} />{name(s)}
            <button className="x" aria-label={`Quitar ${name(s)}`} onClick={() => onChange(value.filter((x) => x !== s))}>×</button>
          </span>
        ))}
      </div>
      {value.length < max ? (
        <select className="lab-select" value="" onChange={(e) => e.target.value && onChange([...value, e.target.value])}>
          <option value="">{placeholder}</option>
          {civs.filter((c) => !value.includes(c.slug)).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      ) : null}
    </div>
  );
}

/** Selector de una civ con su emblema al lado. */
export function CivSelect({ value, onChange, blank = "—", list }: {
  value: string; onChange: (v: string) => void; blank?: string; list?: { slug: string; name: string }[];
}) {
  const { civs } = useTeamCivs();
  const options = list ?? civs;
  return (
    <span className="inline-flex items-center gap-1.5">
      <GkEmblem slug={value} size="m" />
      <select className="lab-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{blank}</option>
        {options.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
      </select>
    </span>
  );
}

export const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`;
export const parseTime = (s: string) => { const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?$/); return m ? +m[1] * 60 + +(m[2] ?? 0) : null; };
