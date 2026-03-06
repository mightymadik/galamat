import { cookies } from "next/headers";
import { verifyAccessToken } from "../../../../lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "../../../../lib/strapiServer";

type StrapiList<T> = { data: T[] };

export async function GET() {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;

    if (!access) return Response.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return Response.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const baseRaw = getStrapiBaseUrl();
    const base = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const url =
      `${base}/api/customers` +
      `?filters[id][$eq]=${payload.sub}` +
      `&pagination[pageSize]=1`;

    const res = await strapiAxios.get(url, { headers });
    const raw: any = (res.data as StrapiList<any>)?.data?.[0];

    if (!raw?.id) return Response.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const attrs = raw?.attributes ?? raw;
    const documentId = raw?.documentId ?? attrs?.documentId ?? String(raw.id);
    return Response.json({
      status: "ok",
      user: {
        id: raw.id,
        documentId,
        phone: attrs.phone ?? raw.phone ?? "",
        role: attrs.role ?? raw.role ?? "customer",
        name: attrs.name ?? raw.name ?? undefined,
        surname: attrs.surname ?? raw.surname ?? undefined,
      },
    });
  } catch {
    return Response.json({ status: "error", message: "server_error" }, { status: 500 });
  }
}