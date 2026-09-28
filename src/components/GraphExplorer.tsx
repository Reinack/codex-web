"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, {
  type Core,
  type NodeDefinition,
  type EdgeDefinition,
} from "cytoscape";
import fcose from "cytoscape-fcose";
import type { GraphData } from "@/lib/api/schema";
import { relLabel } from "@/lib/graph/rels";

// Registrar el layout force-directed (idempotente entre HMR/recargas).
let fcoseRegistered = false;
function ensureFcose() {
  if (!fcoseRegistered) {
    cytoscape.use(fcose);
    fcoseRegistered = true;
  }
}

// Paleta por tipo de nodo: pigmentos de la guía de estilo del árbol (unidades
// lapislázuli, tecnologías verdín, edificios almagre…).
const TYPE_COLOR: Record<string, string> = {
  civ: "#8a1812",
  unit: "#2a5d86",
  strateg: "#5d2a63",
  tech: "#2e6a45",
  building: "#7b3a22",
  map: "#53682a",
  player: "#792243",
};
function colorForType(type?: string | null): string {
  const t = (type || "").toLowerCase();
  for (const key of Object.keys(TYPE_COLOR)) if (t.includes(key)) return TYPE_COLOR[key];
  return "#6f5234";
}
const TYPE_LABEL_ES: Record<string, string> = {
  meta: "Meta",
  matchups: "Matchup",
  matchup: "Matchup",
  counters: "Counter",
  resources: "Recurso",
  technologies: "Tecnología",
  root: "General",
};
function labelForType(type?: string | null): string {
  const t = (type || "").toLowerCase();
  if (t.includes("civ")) return "Civilización";
  if (t.includes("unit")) return "Unidad";
  if (t.includes("strateg")) return "Estrategia";
  if (t.includes("tech")) return "Tecnología";
  if (t.includes("building")) return "Edificio";
  if (t.includes("map")) return "Mapa";
  if (t.includes("player")) return "Jugador";
  if (TYPE_LABEL_ES[t]) return TYPE_LABEL_ES[t];
  // Fallback: capitaliza el tipo crudo en vez de mostrarlo en minúscula.
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : "Otro";
}

export function GraphExplorer({
  graph,
  centerId,
  onSelect,
  onExplore,
}: {
  graph: GraphData;
  centerId: string;
  onSelect?: (id: string | null) => void;
  onExplore?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelect);
  const onExploreRef = useRef(onExplore);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onExploreRef.current = onExplore;
  }, [onSelect, onExplore]);

  // Tipos presentes → leyenda (se recalcula sólo si cambia el grafo).
  const [showLegend, setShowLegend] = useState(false);
  const legend = useMemo(() => {
    const seen = new Map<string, string>();
    for (const n of graph.nodes) {
      const key = labelForType(n.type);
      if (!seen.has(key)) seen.set(key, colorForType(n.type));
    }
    return [...seen.entries()].map(([label, color]) => ({ label, color }));
  }, [graph]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    ensureFcose();

    // El grafo se dibuja sobre el pergamino: tinta y papel de la guía de estilo.
    const ink = "#22150b";
    const textBg = "#ecdcb6";
    const edgeColor = "#4b331c";

    // Grado de cada nodo → tamaño (centralidad visual, estándar en exploradores).
    const degree = new Map<string, number>();
    for (const e of graph.edges) {
      degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
      degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
    }
    const maxDeg = Math.max(1, ...degree.values());

    const nodes: NodeDefinition[] = graph.nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.label ?? n.id,
        type: n.type ?? "",
        color: colorForType(n.type),
        degree: degree.get(n.id) ?? 0,
        center: n.id === centerId ? 1 : 0,
      },
    }));
    const edges: EdgeDefinition[] = graph.edges.map((e, i) => ({
      data: { id: `e${i}`, source: e.from, target: e.to, label: relLabel(e.rel) },
    }));

    const cy = cytoscape({
      container,
      elements: { nodes, edges },
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            label: "data(label)",
            "font-size": 10,
            "font-weight": 600,
            "font-family": "Crimson Pro, Georgia, serif",
            color: ink,
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 5,
            "text-wrap": "wrap",
            "text-max-width": "120px",
            "text-background-color": textBg,
            "text-background-opacity": 0.75,
            "text-background-padding": "3px",
            "text-background-shape": "rectangle",
            "border-width": 2,
            "border-color": textBg,
            width: `mapData(degree, 0, ${maxDeg}, 26, 60)`,
            height: `mapData(degree, 0, ${maxDeg}, 26, 60)`,
            "transition-property": "opacity, border-color, border-width",
            "transition-duration": 150,
          },
        },
        {
          selector: "node[center = 1]",
          style: {
            "border-width": 4,
            "border-color": "#c69b45",
            "font-size": 13,
            "font-weight": 700,
            width: 64,
            height: 64,
            "z-index": 10,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "curve-style": "bezier",
            "line-color": edgeColor,
            "target-arrow-shape": "triangle",
            "target-arrow-color": edgeColor,
            "arrow-scale": 0.8,
            label: "",
            "font-size": 8,
            color: "#6f5234",
            "text-rotation": "autorotate",
            "text-background-color": textBg,
            "text-background-opacity": 0.85,
            "text-background-padding": "2px",
            opacity: 0.45,
            "transition-property": "opacity, line-color, width",
            "transition-duration": 150,
          },
        },
        // Resaltado de vecindario: nodo/arista activos brillan, el resto se atenúa.
        { selector: ".faded", style: { opacity: 0.12, "text-opacity": 0.12 } },
        {
          selector: "node.highlight",
          style: { "border-color": "#8a1812", "border-width": 3, "z-index": 20 },
        },
        {
          selector: "edge.highlight",
          style: { "line-color": "#8a1812", "target-arrow-color": "#8a1812", width: 2.5, opacity: 1, label: "data(label)" },
        },
        { selector: "node:selected", style: { "border-color": "#c69b45", "border-width": 4 } },
      ],
      layout: {
        name: "fcose",
        quality: "default",
        animate: true,
        animationDuration: 600,
        randomize: true,
        nodeRepulsion: 6500,
        idealEdgeLength: 95,
        nodeSeparation: 90,
        padding: 40,
        nestingFactor: 0.1,
      } as cytoscape.LayoutOptions,
      minZoom: 0.15,
      maxZoom: 3,
      wheelSensitivity: 0.25,
    });
    cyRef.current = cy;

    // --- Resaltado de vecindario (hover) ------------------------------------
    const focus = (id: string) => {
      const node = cy.getElementById(id);
      const hood = node.closedNeighborhood();
      cy.elements().addClass("faded");
      hood.removeClass("faded").addClass("highlight");
    };
    const clear = () => cy.elements().removeClass("faded highlight");

    let pinned: string | null = null;
    cy.on("mouseover", "node", (e) => {
      if (!pinned) focus(e.target.id());
    });
    cy.on("mouseout", "node", () => {
      if (!pinned) clear();
    });

    // --- Selección + doble click para expandir ------------------------------
    let lastTap = 0;
    let lastTapId = "";
    cy.on("tap", "node", (e) => {
      const id = e.target.id();
      const now = Date.now();
      if (id === lastTapId && now - lastTap < 350) {
        onExploreRef.current?.(id); // doble click → expandir
        lastTap = 0;
        return;
      }
      lastTap = now;
      lastTapId = id;
      pinned = id;
      focus(id);
      onSelectRef.current?.(id);
    });
    cy.on("tap", (e) => {
      if (e.target === cy) {
        pinned = null;
        clear();
        onSelectRef.current?.(null);
      }
    });

    // Cursor pointer sobre nodos.
    cy.on("mouseover", "node", () => (container.style.cursor = "pointer"));
    cy.on("mouseout", "node", () => (container.style.cursor = "default"));

    // En celular el grafo puede montarse oculto (pestaña "Detalle"): Cytoscape
    // arranca con tamaño 0. Al hacerse visible se redimensiona y reencuadra.
    // También reencuadra si el ancho cambia mucho (rotar la tablet/celular).
    let lastW = container.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      if (w === 0) {
        lastW = 0;
        return;
      }
      cy.resize();
      if (lastW === 0 || Math.abs(w - lastW) / lastW > 0.2) cy.fit(undefined, 40);
      lastW = w;
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, [graph, centerId]);

  const zoomBy = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };
  const fit = () => cyRef.current?.animate({ fit: { eles: cyRef.current.elements(), padding: 40 }, duration: 300 });
  const relayout = () =>
    cyRef.current
      ?.layout({ name: "fcose", animate: true, animationDuration: 600, randomize: true } as cytoscape.LayoutOptions)
      .run();

  return (
    <div className="relative h-[62vh] min-h-[360px] w-full overflow-hidden md:h-[max(460px,55vh)] lg:h-[max(560px,calc(100vh-260px))] rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div ref={containerRef} className="h-full w-full" />

      {/* Toolbar de controles (estilo Bloom/Linkurious) */}
      <div className="absolute right-2 top-2 flex flex-col gap-1 rounded-lg md:right-3 md:top-3 border border-zinc-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <ToolBtn label="Acercar" onClick={() => zoomBy(1.3)}>＋</ToolBtn>
        <ToolBtn label="Alejar" onClick={() => zoomBy(1 / 1.3)}>－</ToolBtn>
        <ToolBtn label="Ajustar a pantalla" onClick={fit}>⤢</ToolBtn>
        <ToolBtn label="Reorganizar" onClick={relayout}>⟳</ToolBtn>
        {legend.length > 0 && (
          <ToolBtn label="Leyenda" onClick={() => setShowLegend((v) => !v)} className="md:hidden">
            ◧
          </ToolBtn>
        )}
      </div>

      {/* Leyenda de tipos */}
      {legend.length > 0 && (
        <div className={`${showLegend ? "flex" : "hidden md:flex"} absolute bottom-2 left-2 flex-col gap-1 md:bottom-3 md:left-3 rounded-lg border border-zinc-200 bg-white/90 p-2.5 text-xs shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90`}>
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
              <span className="text-zinc-600 dark:text-zinc-300">{l.label}</span>
            </span>
          ))}
        </div>
      )}

      <span className="absolute bottom-3 right-3 hidden rounded-md bg-zinc-500/10 px-2 py-1 text-[11px] text-zinc-400 md:block">
        doble click en un nodo para expandir
      </span>
    </div>
  );
}

function ToolBtn({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`${className} flex h-9 w-9 items-center justify-center rounded-md text-lg md:h-8 md:w-8 leading-none text-zinc-600 transition-colors hover:bg-amber-500/15 hover:text-amber-600 dark:text-zinc-300 dark:hover:text-amber-400`}
    >
      {children}
    </button>
  );
}
