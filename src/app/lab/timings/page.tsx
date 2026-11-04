import type { Metadata } from "next";
import { TimingsTab } from "@/components/lab/TimingsTab";

export const metadata: Metadata = {
  title: "Timings",
  description: "Benchmarks de timing de Feudal, Castle e Imperial citados de la wiki.",
};

export default function Page() {
  return <TimingsTab />;
}
