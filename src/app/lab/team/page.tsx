import type { Metadata } from "next";
import { TeamTab } from "@/components/lab/TeamTab";

export const metadata: Metadata = {
  title: "Team Lab",
  description: "Equipos de 1 a 4 civs: flanco y pocket, sinergias y cobertura de unidades.",
};

export default function Page() {
  return <TeamTab />;
}
