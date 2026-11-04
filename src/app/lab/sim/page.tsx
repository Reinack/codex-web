import type { Metadata } from "next";
import { SimTab } from "@/components/lab/SimTab";

export const metadata: Metadata = {
  title: "Simulador",
  description: "Simulador de combate y matriz de eficiencia de costo.",
};

export default function Page() {
  return <SimTab />;
}
