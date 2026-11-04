import { LabNav } from "@/components/lab/LabNav";

// Lab: build orders, timings, mapas, scouting, equipos, draft, simulador y estudio. Datos del Express (/api/lab/*).
export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <LabNav />
      {children}
    </div>
  );
}
