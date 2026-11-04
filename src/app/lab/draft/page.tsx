import type { Metadata } from "next";
import { DraftTab } from "@/components/lab/DraftTab";

export const metadata: Metadata = {
  title: "Draft",
  description: "Picks y bans por mapa y contra las civs del rival.",
};

export default function Page() {
  return <DraftTab />;
}
