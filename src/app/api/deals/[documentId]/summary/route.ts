import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/**
 * GET: для текущего пользователя возвращает сводку по сделке (статус, квартира, doodocs id, agreementFileUrl).
 * Используется для возобновления подписания после перезагрузки (баннер «Продолжить подписание»).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    verifyAccessToken(access);

    const resolved = await params;
    const documentId = resolved?.documentId;
    if (!documentId || typeof documentId !== "string") {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const baseUrl = base.replace(/\/api\/?$/, "");
    const headers = getStrapiHeaders();

    // Запрос с property; по возможности с project (для projectDocumentId — «Отправить на подпись»)
    let deal: any = null;
    let projectDocumentId: string | null = null;
    try {
      const dealRes = await strapiAxios.get(
        `${base}/api/deals/${documentId}?populate[property][populate][project][fields][0]=documentId`,
        { headers }
      );
      deal = (dealRes.data as any)?.data ?? dealRes.data;
    } catch {
      const fallbackRes = await strapiAxios.get(
        `${base}/api/deals/${documentId}?populate[property]=true`,
        { headers }
      );
      deal = (fallbackRes.data as any)?.data ?? fallbackRes.data;
    }
    if (!deal) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });

    const dealStatus = deal?.dealStatus ?? deal?.attributes?.dealStatus;
    const doodocsDocumentId = deal?.doodocsDocumentId ?? deal?.attributes?.doodocsDocumentId ?? null;
    let property = deal?.property ?? deal?.attributes?.property;
    if (property && typeof property === "object" && "data" in property)
      property = (property as { data?: { documentId?: string; project?: { documentId?: string; id?: string } } }).data;
    const propertyDocumentId = property?.documentId ?? (property as any)?.id ?? null;
    const project = (property as any)?.project ?? (property as any)?.attributes?.project?.data ?? (property as any)?.attributes?.project;
    if (project?.documentId != null || project?.id != null)
      projectDocumentId = project?.documentId != null ? String(project.documentId) : String(project.id);
    // Если проект не подтянулся из сделки — запрашиваем квартиру с проектом
    if (!projectDocumentId && propertyDocumentId) {
      try {
        const propRes = await strapiAxios.get(
          `${base}/api/properties/${encodeURIComponent(propertyDocumentId)}?populate[project][fields][0]=documentId`,
          { headers }
        );
        const prop: any = (propRes.data as any)?.data ?? propRes.data;
        const proj = prop?.project ?? prop?.attributes?.project?.data ?? prop?.attributes?.project;
        if (proj?.documentId != null || proj?.id != null)
          projectDocumentId = proj?.documentId != null ? String(proj.documentId) : String(proj.id);
      } catch {
        // ignore
      }
    }

    // Ссылка на файл договора по сделке — чтобы кнопка «Отправить на подпись» была доступна после перезагрузки
    let agreementFileUrl: string | null = null;
    try {
      // Strapi v5: пробуем полный populate, затем только relation
      const saRes = await strapiAxios.get(
        `${base}/api/signed-agreements?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}&sort[0]=createdAt:desc&pagination[pageSize]=1&populate[signedAgreement]=true`,
        { headers }
      );
      const saList: any[] = (saRes.data as any)?.data ?? [];
      const sa = Array.isArray(saList) ? saList[0] : null;
      if (sa) {
        const file = sa?.signedAgreement ?? sa?.attributes?.signedAgreement;
        const fileData = (file as any)?.data ?? file ?? file?.data;
        const url =
          (typeof fileData?.url === "string" && fileData.url) ||
          (typeof (fileData?.attributes as any)?.url === "string" && (fileData?.attributes as any).url) ||
          (typeof (file as any)?.url === "string" && (file as any).url);
        if (url) {
          agreementFileUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
        }
      }
    } catch {
      // договор по сделке может ещё не быть создан
    }

    return NextResponse.json({
      dealStatus: dealStatus ?? null,
      propertyDocumentId: propertyDocumentId ?? null,
      projectDocumentId: projectDocumentId ?? null,
      doodocsDocumentId: doodocsDocumentId ?? null,
      agreementFileUrl,
    });
  } catch (err: any) {
    const status = err?.response?.status;
    const message = err?.response?.data?.error?.message ?? err?.message;
    if (status === 404) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });
    return NextResponse.json(
      { error: "server_error", detail: message },
      { status: status && status >= 400 && status < 600 ? status : 500 }
    );
  }
}
