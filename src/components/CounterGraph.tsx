"use client";

import { useEffect, useRef } from "react";
import cytoscape, { type NodeDefinition, type EdgeDefinition } from "cytoscape";
import type { CounterGraph as CounterGraphData, CyNodeData } from "@/lib/api/schema";

// Color por tipo de nodo. 'hard/soft/situational' = lo que te counterea (entrante);
// 'beats-*' = a lo que tu unidad le gana (saliente); 'center' = la unidad buscada.
const NODE_COLOR: Record<string, string> = {
  center: "#f59e0b",
  hard: "#e11d48",
  soft: "#fb923c",
  situational: "#a1a1aa",
  "beats-hard": "#059669",
  "beats-soft": "#2dd4bf",
  "beats-situational": "#38bdf8",
};
const colorFor = (type?: string) => (type && NODE_COLOR[type]) || "#a1a1aa";

export function CounterGraph({
  graph,
  onSelect,
}: {
  graph: CounterGraphData;
  onSelect?: (data: CyNodeData | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref para el callback: así cambiar onSelect no re-monta el grafo (interop limpia).
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Inyectamos el color en data para usar el mapper tipado `data(color)`.
    const nodes: NodeDefinition[] = graph.nodes.map((n) => ({
      data: { ...n.data, color: colorFor(n.data.type) },
    }));
    const edges: EdgeDefinition[] = graph.edges.map((e) => ({
      data: { ...e.data, source: String(e.data.source), target: String(e.data.target) },
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
            color: "#fff",
            "font-size": 11,
            "text-valign": "center",
            "text-halign": "center",
            "text-wrap": "wrap",
            "text-max-width": "78px",
            "text-outline-width": 2,
            "text-outline-color": "data(color)",
            width: 46,
            height: 46,
          },
        },
        {
          selector: 'node[type="center"]',
          style: { width: 72, height: 72, "font-size": 13, "font-weight": "bold" },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
            opacity: 0.65,
          },
        },
        { selector: "node:selected", style: { "border-width": 3, "border-color": "#0ea5e9" } },
      ],
      layout: {
        name: "concentric",
        concentric: (n) => (n.data("type") === "center" ? 10 : 1),
        levelWidth: () => 1,
        minNodeSpacing: 28,
        padding: 24,
      },
      minZoom: 0.3,
      maxZoom: 2.5,
    });

    cy.on("tap", "node", (evt) => onSelectRef.current?.(evt.target.data() as CyNodeData));
    cy.on("tap", (evt) => {
      if (evt.target === cy) onSelectRef.current?.(null);
    });

    return () => cy.destroy();
  }, [graph]);

  return (
    <div
      ref={containerRef}
      className="h-[480px] w-full rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    />
  );
}
