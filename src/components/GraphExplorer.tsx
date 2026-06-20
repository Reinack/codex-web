"use client";

import { useEffect, useRef } from "react";
import cytoscape, { type NodeDefinition, type EdgeDefinition } from "cytoscape";
import type { GraphData } from "@/lib/api/schema";

// Color por tipo de nodo (mismo esquema que el explorador original).
function colorForType(type?: string | null): string {
  const t = (type || "").toLowerCase();
  if (t.includes("civ")) return "#e8b84b";
  if (t.includes("unit")) return "#6baed6";
  if (t.includes("strateg")) return "#9e9ac8";
  if (t.includes("tech")) return "#74c476";
  if (t.includes("building")) return "#fd8d3c";
  return "#8b949e";
}

export function GraphExplorer({
  graph,
  centerId,
  onSelect,
}: {
  graph: GraphData;
  centerId: string;
  onSelect?: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes: NodeDefinition[] = graph.nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.label ?? n.id,
        type: n.type ?? "",
        color: colorForType(n.type),
        center: n.id === centerId ? 1 : 0,
      },
    }));
    const edges: EdgeDefinition[] = graph.edges.map((e, i) => ({
      data: { id: `e${i}`, source: e.from, target: e.to, label: e.rel ?? "" },
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
            color: "#f8fafc",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 4,
            "text-wrap": "wrap",
            "text-max-width": "110px",
            "text-background-color": "#0f172a",
            "text-background-opacity": 0.8,
            "text-background-padding": "3px",
            "text-background-shape": "roundrectangle",
            width: 30,
            height: 30,
          },
        },
        {
          selector: "node[center = 1]",
          style: { width: 58, height: 58, "font-size": 12, "border-width": 4, "border-color": "#f59e0b" },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "curve-style": "bezier",
            "line-color": "#cbd5e1",
            "target-arrow-shape": "none",
            label: "data(label)",
            "font-size": 8,
            color: "#94a3b8",
            "text-rotation": "autorotate",
            opacity: 0.7,
          },
        },
        { selector: "node:selected", style: { "border-width": 4, "border-color": "#0ea5e9" } },
      ],
      layout: {
        name: "concentric",
        concentric: (n) => (n.data("center") === 1 ? 10 : 1),
        levelWidth: () => 1,
        minNodeSpacing: 34,
        padding: 30,
      },
      minZoom: 0.2,
      maxZoom: 2.5,
      wheelSensitivity: 0.2,
    });

    cy.on("tap", "node", (evt) => onSelectRef.current?.(evt.target.id()));
    cy.on("tap", (evt) => {
      if (evt.target === cy) onSelectRef.current?.(null);
    });

    return () => cy.destroy();
  }, [graph, centerId]);

  return (
    <div
      ref={containerRef}
      className="h-[560px] w-full rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    />
  );
}
