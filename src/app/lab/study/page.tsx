import type { Metadata } from "next";
import { StudyTab } from "@/components/lab/StudyTab";

export const metadata: Metadata = {
  title: "Estudio",
  description: "Tarjetas con repetición espaciada de civs, bonus y posiciones.",
};

export default function Page() {
  return <StudyTab />;
}
