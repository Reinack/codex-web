import type { Metadata } from "next";
import { ScoutingTab } from "@/components/lab/ScoutingTab";

export const metadata: Metadata = {
  title: "Scouting",
  description: "Árbol de scouting: qué viste, qué significa y cómo responder, por equipo.",
};

export default function Page() {
  return <ScoutingTab />;
}
