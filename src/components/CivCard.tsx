import Image from "next/image";
import Link from "next/link";
import type { CivListItem } from "@/lib/api/schema";
import { civEmblemUrl } from "@/lib/img";

const TIER_COLOR: Record<string, string> = {
  S: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  A: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  B: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  C: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  D: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

export function CivCard({ civ }: { civ: CivListItem }) {
  const tierKey = civ.tier?.trim().charAt(0).toUpperCase() ?? "";
  return (
    <Link
      href={`/civs/${civ.slug}`}
      className="surface surface-hover group flex flex-col items-center gap-2 p-4 text-center"
    >
      <Image
        src={civEmblemUrl(civ.slug)}
        alt={`Emblema de ${civ.title}`}
        width={52}
        height={52}
        className="h-[52px] w-[52px] object-contain"
        unoptimized
      />
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {civ.title}
      </span>
      {civ.tier && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            TIER_COLOR[tierKey] ?? "bg-zinc-500/15 text-zinc-500"
          }`}
        >
          Arabia {civ.tier}
        </span>
      )}
    </Link>
  );
}
