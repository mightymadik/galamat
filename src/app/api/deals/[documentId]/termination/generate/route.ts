import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { buildAgreementNumber, agreementNumberForFilename } from "@/lib/agreementNumber";

function formatIin(iin: string | number | null | undefined): string {
  if (iin == null) return "";
  const s = String(iin).replace(/\D/g, "");
  return s.length <= 12 ? s.padStart(12, "0") : s.slice(-12);
}

function formatDateRu(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(String(iso).replace(" ", "T").slice(0, 10));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fullName(surname: string, name: string, middlename: string): string {
  return [surname, name, middlename].filter(Boolean).join(" ") || "—";
}

/**
 * POST /api/deals/[documentId]/termination/generate
 * Body: { customerIIK: string, customerBIK: string, customerBank: string }
 * Generates termination agreement from terminationTemplate, creates signed-agreement, returns fileUrl and signedAgreementDocumentId.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { documentId: dealDocumentId } = await params;
    if (!dealDocumentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { customerIIK, customerBIK, customerBank } = body as {
      customerIIK?: string;
      customerBIK?: string;
      customerBank?: string;
    };
    if (!customerIIK || typeof customerIIK !== "string")
      return NextResponse.json({ error: "customerIIK required" }, { status: 400 });
    if (!customerBIK || typeof customerBIK !== "string")
      return NextResponse.json({ error: "customerBIK required" }, { status: 400 });
    if (!customerBank || typeof customerBank !== "string")
      return NextResponse.json({ error: "customerBank required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/$/, "").replace(/\/api\/?$/, "");
    const headers = getStrapiHeaders();

    let effectiveRole: string = payload.role ?? "customer";
    if (effectiveRole !== "manager" && effectiveRole !== "admin") {
      const customerRes = await strapiAxios
        .get(`${base}/api/customers?filters[id][$eq]=${payload.sub}&pagination[pageSize]=1&fields[0]=role`, { headers })
        .catch(() => null);
      const customer: any = (customerRes?.data as any)?.data?.[0];
      effectiveRole = customer?.role ?? customer?.attributes?.role ?? effectiveRole;
    }
    if (effectiveRole !== "manager" && effectiveRole !== "admin")
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${dealDocumentId}` +
        "?populate[property][populate][project][populate][developer]=true" +
        "&populate[property][populate][project][populate][complexes][fields][0]=complexAddress" +
        "&populate[customer]=true",
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });

    const managerId = deal?.manager?.id ?? deal?.attributes?.manager?.id ?? (deal?.manager as any)?.data?.id;
    if (effectiveRole === "manager" && managerId != null && Number(managerId) !== Number(payload.sub))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const cust = deal?.customer ?? deal?.attributes?.customer;
    const custData = (cust as any)?.data ?? cust;
    if (!custData?.documentId && !custData?.id)
      return NextResponse.json({ error: "У сделки нет клиента" }, { status: 400 });

    const prop = deal?.property ?? deal?.attributes?.property;
    const propData = (prop as any)?.data ?? prop;
    const project = propData?.project ?? propData?.attributes?.project?.data ?? propData?.attributes?.project;
    const projectDocumentId = project?.documentId ?? project?.id;
    if (!projectDocumentId)
      return NextResponse.json({ error: "У сделки нет объекта/проекта" }, { status: 400 });

    const agreementsRes = await strapiAxios.get(
      `${base}/api/agreements` +
        `?filters[project][documentId][$eq]=${encodeURIComponent(projectDocumentId)}` +
        `&pagination[pageSize]=1&populate[terminationTemplate]=true&populate[project][populate][developer]=true`,
      { headers }
    );
    const agreementItem: any = (agreementsRes.data as any)?.data?.[0];
    if (!agreementItem)
      return NextResponse.json({ error: "По проекту не найден шаблон договоров (agreement)" }, { status: 404 });

    const termMedia = agreementItem?.terminationTemplate ?? agreementItem?.attributes?.terminationTemplate;
    const termUrlRaw = Array.isArray(termMedia) ? termMedia[0]?.url : termMedia?.url;
    const termUrl = termUrlRaw?.startsWith("http") ? termUrlRaw : termUrlRaw ? base + (termUrlRaw.startsWith("/") ? "" : "/") + termUrlRaw : null;
    if (!termUrl)
      return NextResponse.json({ error: "У соглашения нет шаблона расторжения (terminationTemplate)" }, { status: 404 });

    const agreementCode = agreementItem?.agreementCode ?? agreementItem?.attributes?.agreementCode ?? "";
    const agreementType = agreementItem?.agreementType ?? agreementItem?.attributes?.agreementType ?? "Квартиры";

    const dev = project?.developer ?? project?.attributes?.developer?.data ?? project?.attributes?.developer;
    const developerName = (dev?.name ?? dev?.attributes?.name ?? "Застройщик").trim() || "Застройщик";
    const bin = String(dev?.bin ?? dev?.attributes?.bin ?? "").replace(/\D/g, "").padStart(12, "0").slice(-12);
    const developerAddressRus = dev?.addressRus ?? dev?.attributes?.addressRus ?? "";
    const developerAddressKz = dev?.addressKz ?? dev?.attributes?.addressKz ?? "";
    const iik = dev?.iik ?? dev?.attributes?.iik ?? "";
    const bank = dev?.bank ?? dev?.attributes?.bank ?? "";
    const bik = dev?.bik ?? dev?.attributes?.bik ?? "";
    const developerPhoneNumber = dev?.phoneNumber ?? dev?.attributes?.phoneNumber ?? "";

    const house = propData?.house ?? propData?.attributes?.house ?? "";
    const apartmentNumber = propData?.apartmentNumber ?? propData?.attributes?.apartmentNumber ?? "";
    const entrance = propData?.entrance ?? propData?.attributes?.entrance ?? "";
    const agreementNumber = buildAgreementNumber(agreementCode, house, apartmentNumber, entrance);

    const currentDate = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

    const saListRes = await strapiAxios.get(
      `${base}/api/signed-agreements?filters[deal][documentId][$eq]=${encodeURIComponent(dealDocumentId)}&sort[0]=createdAt:desc&pagination[pageSize]=1&fields[0]=signedAt`,
      { headers }
    );
    const saList: any[] = (saListRes.data as any)?.data ?? [];
    const firstSa = Array.isArray(saList) ? saList[0] : null;
    const signedAtRaw = firstSa?.signedAt ?? firstSa?.attributes?.signedAt;
    const signedAt = signedAtRaw ? formatDateRu(signedAtRaw) : currentDate;

    const complexes = project?.complexes ?? project?.attributes?.complexes?.data ?? project?.attributes?.complexes ?? [];
    const firstComplex = Array.isArray(complexes) ? complexes[0] : complexes;
    const complexAddress =
      firstComplex?.complexAddress ?? firstComplex?.attributes?.complexAddress ?? project?.projectName ?? project?.attributes?.projectName ?? "";

    const attrs = custData?.attributes ?? custData;
    const customerName = fullName(
      custData?.surname ?? attrs?.surname ?? "",
      custData?.name ?? attrs?.name ?? "",
      custData?.middlename ?? attrs?.middlename ?? ""
    );
    const customerDocNumber = String(custData?.docNumber ?? attrs?.docNumber ?? "");
    const customerDocIssuer = custData?.docIssuer ?? attrs?.docIssuer ?? "";
    const customerDateIssue = formatDateRu(custData?.dateIssue ?? attrs?.dateIssue);
    const customerIIN = formatIin(custData?.iin ?? attrs?.iin);
    const customerAddress = custData?.address ?? attrs?.address ?? "";
    const customerPhone = custData?.phone ?? attrs?.phone ?? "";

    const replaceData: Record<string, unknown> = {
      agreementNumber,
      signedAt,
      currentDate,
      complexAddress,
      developerName,
      bin,
      developerAddressRus,
      developerAddressKz,
      iik,
      bank,
      developerPhoneNumber,
      customerName,
      customerDocNumber,
      customerDocIssuer,
      customerDateIssue,
      customerIIN,
      customerAddress,
      customerPhone,
      customerIIK: String(customerIIK ?? "").trim(),
      customerBIK: String(customerBIK ?? "").trim(),
      customerBank: String(customerBank ?? "").trim(),
    };

    const templateRes = await fetch(termUrl);
    if (!templateRes.ok)
      return NextResponse.json({ error: "Не удалось загрузить шаблон расторжения" }, { status: 502 });
    const templateBuffer = Buffer.from(await templateRes.arrayBuffer());

    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });
    doc.render(replaceData);
    const outZip = doc.getZip();
    const outBuffer = outZip.generate({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("files", outBuffer, {
      filename: `Расторжение ${agreementNumberForFilename(agreementNumber)}.docx`,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const uploadRes = await strapiAxios.post(`${base}/api/upload`, form, {
      headers: { ...headers, ...form.getHeaders() },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    const uploadData = (uploadRes.data as any) ?? [];
    const firstFile = Array.isArray(uploadData) ? uploadData[0] : uploadData;
    const fileId = firstFile?.id;
    if (!fileId)
      return NextResponse.json({ error: "Ошибка загрузки сгенерированного файла" }, { status: 502 });

    const rawUrl = firstFile?.url ?? "";
    const fileUrl =
      typeof rawUrl === "string" && rawUrl
        ? rawUrl.startsWith("http")
          ? rawUrl
          : `${base.replace(/\/api\/?$/, "").replace(/\/$/, "")}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`
        : null;

    const saCreateRes = await strapiAxios.post(
      `${base}/api/signed-agreements`,
      {
        data: {
          user: payload.sub,
          signedAgreement: fileId,
          agreementType: agreementType as "Квартиры" | "Коммерция" | "Паркинг" | "Кладовка",
          deal: { connect: [dealDocumentId] },
        },
      },
      { headers }
    );
    const saCreated = (saCreateRes.data as any)?.data ?? saCreateRes.data;
    const signedAgreementDocumentId = saCreated?.documentId ?? saCreated?.id ?? null;

    return NextResponse.json({
      status: "ok",
      fileUrl,
      signedAgreementDocumentId,
      agreementNumber,
    });
  } catch (e: any) {
    console.error("[deals/termination/generate]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
