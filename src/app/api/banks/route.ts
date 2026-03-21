import { NextResponse } from "next/server";
import { getStrapiBaseUrl, strapiAxios } from "@/lib/strapiServer";

type BankItem = {
  id: string | number;
  name: string;
  bik?: string;
  iik?: string;
};

const FALLBACK_BANKS: BankItem[] = [
  { id: "fallback-1", name: "АО «Народный Банк Казахстана»" },
  { id: "fallback-2", name: "АО «Kaspi Bank»" },
  { id: "fallback-3", name: "АО «ForteBank»" },
  { id: "fallback-4", name: "АО «Банк ЦентрКредит»" },
  { id: "fallback-5", name: "АО «Freedom Bank Kazakhstan»" },
  { id: "fallback-6", name: "АО «Bereke Bank»", bik: "BRKEKZKA" },
  { id: "fallback-7", name: "АО «Bank RBK»" },
  { id: "fallback-8", name: "АО «Altyn Bank»" },
];

function pickString(obj: any, keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export async function GET() {
  try {
    const baseRaw = getStrapiBaseUrl();
    const base = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");

    const url =
      `${base}/api/banks` +
      `?pagination[pageSize]=200` +
      `&fields[0]=name&fields[1]=title&fields[2]=bank&fields[3]=bankName&fields[4]=nameBank&fields[5]=bik&fields[6]=iik`;

    let list: any[] = [];
    const token = process.env.STRAPI_API_TOKEN;
    if (token) {
      try {
        const res = await strapiAxios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        list = (res.data as any)?.data ?? [];
      } catch {
        list = [];
      }
    }

    // Fallback to public request if token is missing/invalid.
    if (!Array.isArray(list) || list.length === 0) {
      const publicRes = await fetch(url, { cache: "no-store" });
      const publicJson = await publicRes.json().catch(() => ({}));
      list = Array.isArray(publicJson?.data) ? publicJson.data : [];
    }

    const banks: BankItem[] = (Array.isArray(list) ? list : [])
      .map((item: any) => {
        const attrs = item?.attributes ?? item;
        const name = pickString(attrs, ["nameBank", "name", "title", "bankName", "bank"]);
        const bik = pickString(attrs, ["bik", "BIK"]);
        const iik = pickString(attrs, ["iik", "IIK"]);
        const id = item?.documentId ?? item?.id ?? attrs?.documentId ?? attrs?.id ?? name;
        return { id, name, bik: bik || undefined, iik: iik || undefined };
      })
      .filter((b) => !!b.name)
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));

    return NextResponse.json({ data: banks.length > 0 ? banks : FALLBACK_BANKS });
  } catch {
    return NextResponse.json({ data: FALLBACK_BANKS, error: "failed_to_fetch_banks" }, { status: 200 });
  }
}

