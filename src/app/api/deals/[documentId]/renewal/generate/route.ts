import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { convert as numberToCyrillic } from "number-to-cyrillic";
import { buildAgreementNumber, agreementNumberForFilename } from "@/lib/agreementNumber";

function numberToWordsRu(n: number): string {
  try {
    const res = numberToCyrillic(Math.floor(n), { language: "ru" });
    const words = res?.convertedInteger ?? String(n);
    return words + " тенге";
  } catch {
    return String(n) + " тенге";
  }
}

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
 * POST /api/deals/[documentId]/renewal/generate
 * Body: { newCustomerDocumentId: string, typedSum: number }
 * Generates renewal agreement from renewalTemplate, creates signed-agreement, returns fileUrl and signedAgreementDocumentId.
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
    const { newCustomerDocumentId, typedSum } = body as { newCustomerDocumentId?: string; typedSum?: number };
    if (!newCustomerDocumentId || typeof newCustomerDocumentId !== "string")
      return NextResponse.json({ error: "newCustomerDocumentId required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/$/, "").replace(/\/api\/?$/, "");
    const headers = getStrapiHeaders();

    // Resolve manager
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
        "?populate[property][populate][project][populate][developer][populate][confidant]=true" +
        "&populate[property][populate][project][populate][complexes][fields][0]=complexAddress" +
        "&populate[customer]=true",
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });

    const managerId = deal?.manager?.id ?? deal?.attributes?.manager?.id ?? (deal?.manager as any)?.data?.id;
    if (effectiveRole === "manager" && managerId != null && Number(managerId) !== Number(payload.sub))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const prevCust = deal?.customer ?? deal?.attributes?.customer;
    const prevCustData = (prevCust as any)?.data ?? prevCust;
    if (!prevCustData?.documentId && !prevCustData?.id)
      return NextResponse.json({ error: "У сделки нет текущего клиента" }, { status: 400 });

    const prop = deal?.property ?? deal?.attributes?.property;
    const propData = (prop as any)?.data ?? prop;
    const project = propData?.project ?? propData?.attributes?.project?.data ?? propData?.attributes?.project;
    const projectDocumentId = project?.documentId ?? project?.id;
    if (!projectDocumentId)
      return NextResponse.json({ error: "У сделки нет объекта/проекта" }, { status: 400 });

    const newCustRes = await strapiAxios.get(
      `${base}/api/customers/${newCustomerDocumentId}`,
      { headers }
    ).catch(() => null);
    const newCust: any = (newCustRes?.data as any)?.data ?? newCustRes?.data;
    if (!newCust?.documentId && !newCust?.id)
      return NextResponse.json({ error: "Новый клиент не найден" }, { status: 404 });

    const agreementsRes = await strapiAxios.get(
      `${base}/api/agreements` +
        `?filters[project][documentId][$eq]=${encodeURIComponent(projectDocumentId)}` +
        `&pagination[pageSize]=1&populate[renewalTemplate]=true&populate[project][populate][developer][populate][confidant]=true`,
      { headers }
    );
    const agreementItem: any = (agreementsRes.data as any)?.data?.[0];
    if (!agreementItem)
      return NextResponse.json({ error: "По проекту не найден шаблон договоров (agreement)" }, { status: 404 });

    const renewalMedia = agreementItem?.renewalTemplate ?? agreementItem?.attributes?.renewalTemplate;
    const renewalUrlRaw = Array.isArray(renewalMedia) ? renewalMedia[0]?.url : renewalMedia?.url;
    const renewalUrl = renewalUrlRaw?.startsWith("http") ? renewalUrlRaw : renewalUrlRaw ? base + (renewalUrlRaw.startsWith("/") ? "" : "/") + renewalUrlRaw : null;
    if (!renewalUrl)
      return NextResponse.json({ error: "У соглашения нет шаблона переоформления (renewalTemplate)" }, { status: 404 });

    const agreementCode = agreementItem?.agreementCode ?? agreementItem?.attributes?.agreementCode ?? "";
    const agreementType = agreementItem?.agreementType ?? agreementItem?.attributes?.agreementType ?? "Квартиры";

    const dev =
      project?.developer ??
      project?.attributes?.developer?.data ??
      project?.attributes?.developer ??
      agreementItem?.project?.developer ??
      agreementItem?.attributes?.project?.data?.developer ??
      agreementItem?.attributes?.project?.developer;
    const devData = (dev as any)?.data ?? dev;
    const devAttrs = devData?.attributes ?? devData;

    const developerName = String(devAttrs?.name ?? "Застройщик").trim() || "Застройщик";
    const bin = String(devAttrs?.bin ?? "").replace(/\D/g, "").padStart(12, "0").slice(-12);
    const developerAddressRus = devAttrs?.addressRus ?? "";
    const developerAddressKz = devAttrs?.addressKz ?? "";
    const iik = devAttrs?.iik ?? "";
    const bank = devAttrs?.bank ?? "";
    const bik = devAttrs?.bik ?? "";
    const kbe = devAttrs?.kbe ?? "";
    const developerPhoneNumber = devAttrs?.phoneNumber ?? "";

    const house = propData?.house ?? propData?.attributes?.house ?? "";
    const apartmentNumber = propData?.apartmentNumber ?? propData?.attributes?.apartmentNumber ?? "";
    const entrance = propData?.entrance ?? propData?.attributes?.entrance ?? "";
    const totalArea = propData?.totalArea ?? propData?.attributes?.totalArea ?? "";
    const agreementNumber = buildAgreementNumber(agreementCode, house, apartmentNumber, entrance);

    const currentDate = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

    const prevAttrs = prevCustData?.attributes ?? prevCustData;
    const previousClientName = fullName(
      prevCustData?.surname ?? prevAttrs?.surname ?? "",
      prevCustData?.name ?? prevAttrs?.name ?? "",
      prevCustData?.middlename ?? prevAttrs?.middlename ?? ""
    );
    const previousClientAddress = prevCustData?.address ?? prevAttrs?.address ?? "";
    const previousCustomerName = previousClientName;
    const previousCustomerIIN = formatIin(prevCustData?.iin ?? prevAttrs?.iin);
    const previousCustomerBirthDate = formatDateRu(prevCustData?.birthDate ?? prevAttrs?.birthDate);
    const previousCustomerDocNumber = String(prevCustData?.docNumber ?? prevAttrs?.docNumber ?? "");
    const previousCustomerDocIssuer = prevCustData?.docIssuer ?? prevAttrs?.docIssuer ?? "";
    const previousCustomerDateIssue = formatDateRu(prevCustData?.dateIssue ?? prevAttrs?.dateIssue);
    const previousCustomerPhone = prevCustData?.phone ?? prevAttrs?.phone ?? "";
    const previousCustomerEmail = prevCustData?.email ?? prevAttrs?.email ?? "";

    const newAttrs = newCust?.attributes ?? newCust;
    const currentCustomerName = fullName(
      newCust?.surname ?? newAttrs?.surname ?? "",
      newCust?.name ?? newAttrs?.name ?? "",
      newCust?.middlename ?? newAttrs?.middlename ?? ""
    );
    const currentCustomerIIN = formatIin(newCust?.iin ?? newAttrs?.iin);
    const currentCustomerBirthDate = formatDateRu(newCust?.birthDate ?? newAttrs?.birthDate);
    const currentCustomerDocNumber = String(newCust?.docNumber ?? newAttrs?.docNumber ?? "");
    const currentCustomerDocIssuer = newCust?.docIssuer ?? newAttrs?.docIssuer ?? "";
    const currentCustomerDateIssue = formatDateRu(newCust?.dateIssue ?? newAttrs?.dateIssue);
    const currentCustomerPhone = newCust?.phone ?? newAttrs?.phone ?? "";
    const currentCustomerEmail = newCust?.email ?? newAttrs?.email ?? "";
    const currentCustomerAddress = newCust?.address ?? newAttrs?.address ?? "";
    const currentClientName = currentCustomerName;
    const currentClientAddress = currentCustomerAddress;

    const confidantRel = devAttrs?.confidant;
    const confidantData = (confidantRel as any)?.data ?? confidantRel;
    const confidantAttrs = confidantData?.attributes ?? confidantData;
    const confidant =
      confidantData && (confidantData?.id ?? confidantData?.documentId)
        ? fullName(
            confidantData?.surname ?? confidantAttrs?.surname ?? "",
            confidantData?.name ?? confidantAttrs?.name ?? "",
            confidantData?.middlename ?? confidantAttrs?.middlename ?? ""
          )
        : "—";

    const dealPrice = Number(deal?.dealPrice ?? deal?.attributes?.dealPrice ?? 0);
    const typedSumVal = Number(typedSum) || 0;
    const totalSumVal = dealPrice;
    const totalSumFormatted = `${totalSumVal.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`;
    const typedSumFormatted = `${typedSumVal.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`;
    const totalSumWords = numberToWordsRu(totalSumVal);

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

    const replaceData: Record<string, unknown> = {
      agreementNumber,
      currentDate,
      previousClientName,
      previousClientAddress,
      signedAt,
      totalArea: String(totalArea ?? ""),
      complexAddress,
      typedSum: typedSumFormatted,
      totalSum: totalSumFormatted,
      totalSumWords,
      developerName,
      bin,
      developerBIN: bin,
      developerAddressRus,
      developerAddressKz,
      iik,
      bank,
      bik,
      kbe,
      developerPhoneNumber,
      previousCustomerName,
      previousCustomerIIN,
      previousCustomerBirthDate,
      previousCustomerDocNumber,
      previousCustomerDocIssuer,
      previousCustomerDateIssue,
      previousCustomerPhone,
      previousCustomerEmail,
      currentCustomerName,
      currentCustomerIIN,
      currentCustomerBirthDate,
      currentCustomerDocNumber,
      currentCustomerDocIssuer,
      currentCustomerDateIssue,
      currentCustomerPhone,
      currentCustomerEmail,
      currentCustomerAddress,
      currentClientName,
      currentClientAddress,
      confidant,
    };

    const templateRes = await fetch(renewalUrl);
    if (!templateRes.ok)
      return NextResponse.json({ error: "Не удалось загрузить шаблон переоформления" }, { status: 502 });
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
      filename: `Переоформление ${agreementNumberForFilename(agreementNumber)}.docx`,
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
    console.error("[deals/renewal/generate]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
