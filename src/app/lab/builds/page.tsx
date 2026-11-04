import type { Metadata } from "next";
import { BuildsTab } from "@/components/lab/BuildsTab";

export const metadata: Metadata = {
  title: "Build orders",
  description: "Build orders del vault paso a paso, con timer, overlay y medallas contra el benchmark.",
};

export default function Page() {
  return <BuildsTab />;
}
