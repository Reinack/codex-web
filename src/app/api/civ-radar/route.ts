import { type NextRequest, NextResponse } from "next/server";
import { getCivRadar } from "@/lib/api/radar";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Falta el parámetro 'slug'." }, { status: 400 });
  }
  const radar = await getCivRadar(slug);
  if (!radar) {
    return NextResponse.json({ error: "Sin radar para esa civilización." }, { status: 404 });
  }
  return NextResponse.json(radar);
}
