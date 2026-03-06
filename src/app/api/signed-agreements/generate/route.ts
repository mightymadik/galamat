import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { convert as numberToCyrillic } from "number-to-cyrillic";
import ImageModule from "docxtemplater-image-module-free";
import sizeOf from "image-size";
import sharp from "sharp";
import type { AgreementPayload, AgreementPaymentRow } from "@/types/agreement";
import { buildAgreementNumber, agreementNumberForFilename } from "@/lib/agreementNumber";

/** Max width for plan image in docx (px); height scaled to keep aspect ratio */
const PLAN_IMAGE_MAX_WIDTH = 400;

/** Strapi media object (plan image) */
interface StrapiPlanMedia {
  url?: string;
  [key: string]: unknown;
}

/** Flat data sent from frontend for agreement generation */
interface FlatDataPayload {
  id?: string | number;
  title?: string;
  section?: string;
  floor?: string;
  room?: string;
  area?: string;
  apartmentNumber?: number;
  complexDueDate?: string;
  projectDocumentId?: string;
  images?: string[];
  totalArea?: number;
  house?: number;
  entrance?: string;
  plan?: string | StrapiPlanMedia;
}

/** Number to words in Russian (for totalSumWords, totalSumM2Words) */
function numberToWordsRu(n: number): string {
  try {
    const res = numberToCyrillic(Math.floor(n), { language: "ru" });
    const words = res?.convertedInteger ?? String(n);
    return words + " тенге";
  } catch {
    return String(n) + " тенге";
  }
}

/** Number to words in Kazakh (for totalSumWordsKz, totalSumM2WordsKz). Uses "теңге". */
function numberToWordsKz(n: number): string {
  const int = Math.floor(Math.max(0, n));
  if (int === 0) return "нөл теңге";
  const ones = ["", "бір", "екі", "үш", "төрт", "бес", "алты", "жеті", "сегіз", "тоғыз"];
  const tens = ["", "он", "жиырма", "отыз", "қырық", "елу", "алпыс", "жетпіс", "сексен", "тоқсан"];
  const hundred = "жүз";
  const thousand = "мың";
  const million = "миллион";

  function to999(x: number): string {
    if (x === 0) return "";
    if (x < 10) return ones[x];
    if (x < 20) return "он " + (x === 10 ? "" : ones[x - 10]);
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? " " + ones[x % 10] : "");
    const h = Math.floor(x / 100);
    return (h === 1 ? hundred : ones[h] + " " + hundred) + (x % 100 ? " " + to999(x % 100) : "");
  }

  function build(x: number): string {
    if (x === 0) return "";
    if (x < 1000) return to999(x);
    if (x < 1_000_000) {
      const m = Math.floor(x / 1000);
      const r = x % 1000;
      const mPart = m === 1 ? thousand : to999(m) + " " + thousand;
      return mPart + (r ? " " + to999(r) : "");
    }
    const m = Math.floor(x / 1_000_000);
    const r = x % 1_000_000;
    const mPart = m === 1 ? million : to999(m) + " " + million;
    return mPart + (r ? " " + build(r) : "");
  }

  return build(int) + " теңге";
}

/** Short name: Фамилия.И.О. */
function customerNameShortly(surname: string, name: string, middlename: string): string {
  const s = (surname || "").trim();
  const n = (name || "").trim().charAt(0);
  const m = (middlename || "").trim().charAt(0);
  const parts = [s, n, m].filter(Boolean);
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}.${parts[2] || ""}.` : s || "—";
}

/** IIN 12 digits with leading zeros */
function formatIin(iin: string | number | null | undefined): string {
  if (iin == null) return "";
  const s = String(iin).replace(/\D/g, "");
  return s.length <= 12 ? s.padStart(12, "0") : s.slice(-12);
}

/** Returns PNG buffer and [width, height] for plan image (URL or SVG). Word does not support SVG, so SVG is converted to PNG. */
async function getPlanImageBuffer(
  plan: string
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  if (!plan || typeof plan !== "string") return null;
  const trimmed = plan.trim();
  if (!trimmed) return null;

  const isUrl = /^https?:\/\//i.test(trimmed);
  const isDataUrl = /^data:image\//i.test(trimmed);
  const isSvgString = trimmed.startsWith("<") && trimmed.includes("</svg>");

  let buffer: Buffer;
  let width: number;
  let height: number;

  if (isUrl) {
    const res = await fetch(trimmed, {
      headers: { Accept: "image/svg+xml,image/*,*/*" },
    });
    if (!res.ok) return null;
    const arr = new Uint8Array(await res.arrayBuffer());
    buffer = Buffer.from(arr);
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const isSvg = contentType.includes("svg") || /\.svg(\?|$)/i.test(trimmed);
    if (isSvg) {
      const png = await sharp(buffer).png().toBuffer();
      const meta = await sharp(png).metadata();
      width = meta.width ?? 400;
      height = meta.height ?? 300;
      buffer = png;
    } else {
      const dims = sizeOf(buffer);
      if (!dims?.width || !dims?.height) return null;
      width = dims.width;
      height = dims.height;
    }
  } else if (isDataUrl) {
    const base64Match = trimmed.match(/^data:image\/(?:svg\+xml|svg|png|jpeg|jpg);base64,(.+)$/i);
    if (!base64Match) return null;
    const bin = Buffer.from(base64Match[1], "base64");
    const isSvg = /^data:image\/svg/i.test(trimmed);
    if (isSvg) {
      const png = await sharp(bin).png().toBuffer();
      const meta = await sharp(png).metadata();
      width = meta.width ?? 400;
      height = meta.height ?? 300;
      buffer = png;
    } else {
      buffer = bin;
      const dims = sizeOf(buffer);
      if (!dims?.width || !dims?.height) return null;
      width = dims.width;
      height = dims.height;
    }
  } else if (isSvgString) {
    const png = await sharp(Buffer.from(trimmed, "utf-8")).png().toBuffer();
    const meta = await sharp(png).metadata();
    width = meta.width ?? 400;
    height = meta.height ?? 300;
    buffer = png;
  } else {
    return null;
  }

  if (width > PLAN_IMAGE_MAX_WIDTH) {
    const scale = PLAN_IMAGE_MAX_WIDTH / width;
    const newWidth = PLAN_IMAGE_MAX_WIDTH;
    const newHeight = Math.round(height * scale);
    buffer = await sharp(buffer).resize(newWidth, newHeight).png().toBuffer();
    width = newWidth;
    height = newHeight;
  }

  return { buffer, width, height };
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub)
      return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { flatData, agreementPayload, templateType, dealDocumentId } = body as {
      flatData?: FlatDataPayload | null;
      agreementPayload?: AgreementPayload | null;
      templateType?: "pdb" | "ddu";
      /** Если передан — берём данные клиента из сделки (после биометрики) */
      dealDocumentId?: string | null;
    };

    if (!agreementPayload)
      return NextResponse.json(
        { status: "error", message: "agreementPayload required" },
        { status: 400 }
      );

    const useDdu = templateType !== "pdb";

    const baseRaw = getStrapiBaseUrl();
    const base = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    // projectDocumentId: из flatData или из сделки (property.project); сохраняем documentId квартиры для подстановки планировки
    let effectiveProjectDocumentId = flatData?.projectDocumentId;
    let propertyDocumentIdFromDeal: string | null = null;
    if (dealDocumentId) {
      try {
        const dealRes = await strapiAxios.get(
          `${base}/api/deals/${dealDocumentId}?populate[property][populate][project][fields][0]=documentId`,
          { headers }
        );
        const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
        const property = deal?.property ?? deal?.attributes?.property;
        const propData = property?.data ?? property;
        if (propData?.documentId != null || propData?.id != null)
          propertyDocumentIdFromDeal = String(propData?.documentId ?? propData?.id);
        if (!effectiveProjectDocumentId) {
          const project = propData?.project ?? propData?.attributes?.project?.data ?? propData?.attributes?.project;
          const docId = project?.documentId ?? project?.id;
          if (docId != null) effectiveProjectDocumentId = String(docId);
        }
      } catch {
        // ignore
      }
    }
    if (!effectiveProjectDocumentId)
      return NextResponse.json(
        { status: "error", message: "project_not_specified", detail: "Не указан проект (flatData.projectDocumentId или сделка без квартиры/проекта)" },
        { status: 400 }
      );

    // 1) Customer и сумма брони: из сделки (клиент после биометрики) или текущий пользователь
    let customerItem: any = null;
    let reserveSumForContract = 0;
    if (dealDocumentId) {
      try {
        const dealRes = await strapiAxios.get(
          `${base}/api/deals/${dealDocumentId}?populate[customer]=true`,
          { headers }
        );
        const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
        customerItem = deal?.customer ?? deal?.attributes?.customer;
        if (Array.isArray(customerItem)) customerItem = customerItem[0];
        reserveSumForContract = Number(deal?.reserveSum ?? deal?.attributes?.reserveSum ?? 0) || 0;
      } catch {
        // ignore, fallback to current user
      }
    }
    if (!customerItem?.id && !customerItem?.documentId) {
      const customerUrl =
        `${base}/api/customers` +
        `?filters[id][$eq]=${payload.sub}` +
        `&pagination[pageSize]=1`;
      const customerRes = await strapiAxios.get(customerUrl, { headers });
      customerItem = (customerRes.data as any)?.data?.[0];
    }
    if (!customerItem?.id && !customerItem?.documentId)
      return NextResponse.json({ status: "error", message: "customer_not_found" }, { status: 404 });

    const attrs = customerItem?.attributes ?? customerItem;
    const surname = attrs.surname ?? customerItem.surname ?? "";
    const name = attrs.name ?? customerItem.name ?? "";
    const middlename = attrs.middlename ?? customerItem.middlename ?? "";
    const customerName = [surname, name, middlename].filter(Boolean).join(" ") || "—";
    const customerIIN = formatIin(attrs.iin ?? customerItem.iin);
    const customerDocNumber = attrs.docNumber ?? customerItem.docNumber ?? "";
    const customerAddress = attrs.address ?? customerItem.address ?? "";
    const customerBirthDate = attrs.birthDate ?? customerItem.birthDate ?? "";
    const customerDateIssue = attrs.dateIssue ?? customerItem.dateIssue ?? "";
    const customerPhone = attrs.phone ?? customerItem.phone ?? "";
    const customerEmail = attrs.email ?? customerItem.email ?? "";

    // 2) Max floor in building (for floorMax)
    let floorMax = "";
    try {
      const maxFloorUrl =
        `${base}/api/properties` +
        `?filters[project][documentId][$eq]=${encodeURIComponent(effectiveProjectDocumentId)}` +
        `&sort[0]=floor:desc` +
        `&pagination[pageSize]=1` +
        `&fields[0]=floor`;
      const maxFloorRes = await strapiAxios.get(maxFloorUrl, { headers });
      const firstProp: any = (maxFloorRes.data as any)?.data?.[0];
      const floorVal = firstProp?.floor ?? firstProp?.attributes?.floor;
      if (floorVal != null && floorVal !== "") floorMax = String(floorVal);
    } catch {
      // ignore
    }

    // 3) Agreement template by project (ПДБ или ДДУ), with project and developer for agreementNumber and developer data
    const agreementsUrl =
      `${base}/api/agreements` +
      `?filters[project][documentId][$eq]=${encodeURIComponent(effectiveProjectDocumentId)}` +
      `&pagination[pageSize]=1` +
      `&populate[pdbTemplate]=true` +
      `&populate[dduTemplate]=true` +
      `&populate[project][populate][developer]=true`;
    const agreementsRes = await strapiAxios.get(agreementsUrl, { headers });
    const agreementItem: any = (agreementsRes.data as any)?.data?.[0];
    if (!agreementItem)
      return NextResponse.json(
        { status: "error", message: "agreement_not_found", detail: "По проекту не найден шаблон договора" },
        { status: 404 }
      );

    const agreementCode = agreementItem?.agreementCode ?? agreementItem?.attributes?.agreementCode ?? "";
    const projectFromAgreement = agreementItem?.project ?? agreementItem?.attributes?.project?.data ?? agreementItem?.attributes?.project;
    const dev = projectFromAgreement?.developer ?? projectFromAgreement?.attributes?.developer?.data ?? projectFromAgreement?.attributes?.developer;
    const developerName = (dev?.name ?? dev?.attributes?.name ?? "Застройщик").trim() || "Застройщик";
    const bin = String(dev?.bin ?? dev?.attributes?.bin ?? "").replace(/\D/g, "").padStart(12, "0").slice(-12);
    const developerAddressRus = dev?.addressRus ?? dev?.attributes?.addressRus ?? "";
    const developerAddressKz = dev?.addressKz ?? dev?.attributes?.addressKz ?? "";
    const iik = dev?.iik ?? dev?.attributes?.iik ?? "";
    const bank = dev?.bank ?? dev?.attributes?.bank ?? "";
    const bik = dev?.bik ?? dev?.attributes?.bik ?? "";
    const kbe = dev?.kbe ?? dev?.attributes?.kbe ?? "";
    const developerPhoneNumber = dev?.phoneNumber ?? dev?.attributes?.phoneNumber ?? "";

    const propertyHouse = flatData?.house ?? "";
    const propertyApartmentNumber = flatData?.apartmentNumber ?? "";
    const apartmentEntrance = flatData?.entrance ?? "";
    const agreementNumber = buildAgreementNumber(
      agreementCode,
      propertyHouse,
      propertyApartmentNumber,
      apartmentEntrance
    );

    const getMediaUrl = (media: any): string | undefined => {
      if (!media) return undefined;
      const one = Array.isArray(media) ? media[0] : media;
      return one?.url ?? one?.attributes?.url ?? one?.data?.attributes?.url;
    };
    const pdbMedia = agreementItem?.pdbTemplate ?? agreementItem?.attributes?.pdbTemplate;
    const dduMedia = agreementItem?.dduTemplate ?? agreementItem?.attributes?.dduTemplate;
    const pdbUrl = getMediaUrl(pdbMedia);
    const dduUrl = getMediaUrl(dduMedia);
    let templateUrl = useDdu ? dduUrl : pdbUrl;
    let actualTemplateType: "pdb" | "ddu" = useDdu ? "ddu" : "pdb";
    if (!templateUrl && useDdu && pdbUrl) {
      templateUrl = pdbUrl;
      actualTemplateType = "pdb";
    }
    if (!templateUrl)
      return NextResponse.json(
        {
          status: "error",
          message: "template_not_found",
          detail: "Загрузите шаблон договора (ПДБ или ДДУ) в настройках проекта",
        },
        { status: 404 }
      );

    const agreementType = agreementItem.agreementType ?? agreementItem.attributes?.agreementType ?? "Квартиры" as "Квартиры" | "Коммерция" | "Паркинг" | "Кладовка";

    // 4) Download template
    let templateFullUrl = templateUrl;
    if (templateFullUrl.startsWith("/")) templateFullUrl = base + templateFullUrl;
    const templateRes = await fetch(templateFullUrl);
    if (!templateRes.ok)
      return NextResponse.json(
        { status: "error", message: "template_download_failed" },
        { status: 502 }
      );
    const templateBuffer = Buffer.from(await templateRes.arrayBuffer());

    // 5) Build replacement data
    const currentDate = new Date().toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const totalSum = agreementPayload.totalSum ?? 0;
    const totalSumM2 = agreementPayload.totalSumM2 ?? 0;
    const totalSumWords = numberToWordsRu(totalSum);
    const totalSumWordsKz = numberToWordsKz(totalSum);
    const totalSumM2Words = numberToWordsRu(totalSumM2);
    const totalSumM2WordsKz = numberToWordsKz(totalSumM2);
    const reserveSumWords = numberToWordsRu(reserveSumForContract);
    const reserveSumWordsKz = numberToWordsKz(reserveSumForContract);

    const rawSchedule = Array.isArray(agreementPayload.paymentSchedule)
      ? agreementPayload.paymentSchedule
      : [];

    const seenIndex = new Set<number>();
    const scheduleFiltered = rawSchedule.filter((r: AgreementPaymentRow) => {
      const idx = Number(r.index);
      if (seenIndex.has(idx)) return false;
      seenIndex.add(idx);
      return true;
    });

    const currentDateStr = new Date().toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const formatSum = (n: number) => `${n.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`;
    const parseSum = (s: string | undefined): number => {
      if (s == null) return 0;
      const digits = String(s).replace(/\s/g, "").replace(/[^\d]/g, "");
      return parseInt(digits, 10) || 0;
    };
    const reserveSumFormatted = formatSum(reserveSumForContract);

    const paymentScheduleRows: Array<{ index: string; date: string; sum: string; indexKz: string; dateKz: string; sumKz: string }> = [];
    if (reserveSumForContract > 0 && scheduleFiltered.length > 0) {
      const firstAmount = parseSum(scheduleFiltered[0].sum);
      const remainderFirst = Math.max(0, firstAmount - reserveSumForContract);
      paymentScheduleRows.push({
        index: "1",
        date: currentDateStr,
        sum: reserveSumFormatted,
        indexKz: "1",
        dateKz: currentDateStr,
        sumKz: reserveSumFormatted,
      });
      if (remainderFirst > 0) {
        paymentScheduleRows.push({
          index: "2",
          date: scheduleFiltered[0].date,
          sum: formatSum(remainderFirst),
          indexKz: "2",
          dateKz: scheduleFiltered[0].date,
          sumKz: formatSum(remainderFirst),
        });
      }
      for (let i = 1; i < scheduleFiltered.length; i++) {
        const r = scheduleFiltered[i];
        paymentScheduleRows.push({
          index: String(paymentScheduleRows.length + 1),
          date: r.date,
          sum: r.sum,
          indexKz: String(paymentScheduleRows.length + 1),
          dateKz: r.date,
          sumKz: r.sum,
        });
      }
    } else if (reserveSumForContract > 0) {
      paymentScheduleRows.push({
        index: "1",
        date: currentDateStr,
        sum: reserveSumFormatted,
        indexKz: "1",
        dateKz: currentDateStr,
        sumKz: reserveSumFormatted,
      });
    } else {
      scheduleFiltered.forEach((r: AgreementPaymentRow, i: number) => {
        paymentScheduleRows.push({
          index: String(r.index ?? i + 1),
          date: r.date,
          sum: r.sum,
          indexKz: String(r.index ?? i + 1),
          dateKz: r.date,
          sumKz: r.sum,
        });
      });
    }

    const paymentSchedule = paymentScheduleRows;
    const paymentScheduleKz = paymentScheduleRows;
    const paymentIndex = paymentSchedule.map((r) => r.index).join(", ");
    const paymentDate = paymentSchedule.map((r) => r.date).join(", ");
    const paymentSum = paymentSchedule.map((r) => r.sum).join(", ");

    const totalSumFormatted = `${totalSum.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`;
    const totalSumM2Formatted = `${totalSumM2.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`;

    function resolvePlanUrl(base: string, plan?: string | StrapiPlanMedia | null): string {
      if (!plan) return "";

      // plan может быть строкой
      if (typeof plan === "string") {
        const s = plan.trim();
        if (!s) return "";
        if (/^https?:\/\//i.test(s) || /^data:image\//i.test(s) || s.startsWith("<")) return s; // url/dataurl/svg string
        // относительный путь от Strapi: /uploads/...
        if (s.startsWith("/")) return base + s;
        return s;
      }

      // plan может быть объектом Strapi { url: "/uploads/..." }
      const url = typeof plan.url === "string" ? plan.url.trim() : "";
      if (!url) return "";
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith("/")) return base + url;
      return url;
    }

    // Планировка: из flatData или из квартиры сделки (plan / platformPlan)
    let planFromProperty: string | null = null;
    if (!flatData?.plan && propertyDocumentIdFromDeal) {
      try {
        const propRes = await strapiAxios.get(
          `${base}/api/properties/${encodeURIComponent(propertyDocumentIdFromDeal)}?populate[plan][fields][0]=url&populate[platformPlan][fields][0]=url`,
          { headers }
        );
        const prop: any = (propRes.data as any)?.data ?? propRes.data;
        const planMedia = prop?.plan ?? prop?.attributes?.plan;
        const platformMedia = prop?.platformPlan ?? prop?.attributes?.platformPlan;
        const planData = Array.isArray(planMedia) ? planMedia[0] : planMedia?.data ?? planMedia;
        const platformData = Array.isArray(platformMedia) ? platformMedia[0] : platformMedia?.data ?? platformMedia;
        const url1 = typeof planData?.url === "string" ? planData.url : (planData?.attributes as any)?.url;
        const url2 = typeof platformData?.url === "string" ? platformData.url : (platformData?.attributes as any)?.url;
        const raw = url1 || url2;
        if (raw && typeof raw === "string") {
          planFromProperty = raw.startsWith("http") ? raw : `${base.replace(/\/api\/?$/, "")}${raw.startsWith("/") ? "" : "/"}${raw}`;
        }
      } catch {
        // ignore
      }
    }
    const planUrl = resolvePlanUrl(base, flatData?.plan ?? planFromProperty);
    const replaceData: Record<string, unknown> = {
      agreementNumber,
      currentDate,
      agreementType: agreementType as "Квартиры" | "Коммерция" | "Паркинг" | "Кладовка",
      developerName,
      bin,
      developerAddressRus,
      developerAddressKz,
      iik,
      bank,
      bik,
      kbe,
      bek: kbe,
      developerPhoneNumber,
      customerName,
      customerIIN,
      customerDocNumber: String(customerDocNumber ?? ""),
      customerAddress: customerAddress || "—",
      floorMax: floorMax || "—",
      complexName: flatData?.title ?? "",
      propertySection: flatData?.section ?? "",
      propertyFloor: flatData?.floor ?? "",
      propertyRoom: flatData?.room ?? "",
      propertyTotalArea: flatData?.area ?? "",
      propertyApartmentNumber: String(flatData?.apartmentNumber ?? ""),
      plan: planUrl, // {%plan} in template: image; image module uses pre-resolved buffer from this URL
      totalSum: totalSumFormatted,
      totalSumWords,
      totalSumWordsKz,
      reserveSumKz: reserveSumFormatted,
      reserveSum: reserveSumFormatted,
      reserveSumWords,
      reserveSumWordsKz,
      totalSumM2: totalSumM2Formatted,
      totalSumM2Words,
      totalSumM2WordsKz,
      paymentIndex,
      paymentDate,
      paymentSum,
      paymentSchedule,
      paymentScheduleKz,
      customerBirthDate: String(customerBirthDate ?? "").slice(0, 10)
        ? new Date(String(customerBirthDate).replace(" ", "T").slice(0, 10)).toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        : "",
      customerDateIssue: String(customerDateIssue ?? "").slice(0, 10)
        ? new Date(String(customerDateIssue).replace(" ", "T").slice(0, 10)).toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        : "",
      customerDocIssuer: "МВД РК",
      customerDocIssuerKz: "ҚР ІІМ",
      customerPhone: String(customerPhone ?? ""),
      customerEmail: String(customerEmail ?? ""),
      customerNameShortly: customerNameShortly(surname, name, middlename),
    };

    // Ensure loop data is always an array (avoids "Cannot read properties of undefined (reading 'length')")
    if (!Array.isArray(replaceData.paymentSchedule)) {
      replaceData.paymentSchedule = [];
    }
    if (!Array.isArray((replaceData as any).paymentScheduleKz)) {
      (replaceData as any).paymentScheduleKz = replaceData.paymentSchedule;
    }

    const planImage = planUrl ? await getPlanImageBuffer(planUrl) : null;

    // 6) Replace in docx ({%plan} = plan image; image module uses pre-resolved buffer)
    const zip = new PizZip(templateBuffer);
    const imageModule = new ImageModule({
      fileType: "docx",
      centered: false,

      getImage(_tagValue: any, tagName: string) {
        // если в шаблоне есть другие {%...} — не падаем
        if (tagName !== "plan") return Buffer.alloc(0);

        // если картинки нет/не скачалась — возвращаем пустой буфер (не null)
        return planImage?.buffer ?? Buffer.alloc(0);
      },

      getSize(imgBuffer: Buffer, _tagValue: any, tagName: string) {
        if (tagName !== "plan") return [1, 1];

        // если пусто — тоже безопасный размер
        if (!imgBuffer || imgBuffer.length === 0) return [1, 1];

        // если мы заранее вычислили размер — используем его
        if (planImage?.width && planImage?.height) return [planImage.width, planImage.height];

        // fallback
        const dims = sizeOf(imgBuffer);
        if (dims?.width && dims?.height) return [dims.width, dims.height];

        return [PLAN_IMAGE_MAX_WIDTH, 300];
      },
    });
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
      modules: [imageModule],
    });
    doc.render(replaceData);
    const outZip = doc.getZip();
    const outBuffer = outZip.generate({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    // 7) Upload to Strapi
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    const docTypeLabel = actualTemplateType === "ddu" ? "ДДУ" : "ПДБ";
    form.append("files", outBuffer, {
      filename: `${docTypeLabel} ${agreementNumberForFilename(agreementNumber)}.docx`,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const uploadRes = await strapiAxios.post(`${base}/api/upload`, form, {
      headers: {
        ...headers,
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    const uploadData = (uploadRes.data as any) ?? [];
    const firstFile = Array.isArray(uploadData) ? uploadData[0] : uploadData;
    const fileId = firstFile?.id;
    if (!fileId)
      return NextResponse.json(
        { status: "error", message: "upload_failed" },
        { status: 502 }
      );

    const rawUrl = firstFile?.url ?? "";
    const fileUrl =
      typeof rawUrl === "string" && rawUrl
        ? rawUrl.startsWith("http")
          ? rawUrl
          : `${base.replace(/\/api\/?$/, "").replace(/\/$/, "")}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`
        : null;

    // 8) Create signed-agreement (при наличии dealDocumentId привязываем к сделке для ПДБ «подписать на месте»)
    await strapiAxios.post(
      `${base}/api/signed-agreements`,
      {
        data: {
          user: payload.sub,
          signedAgreement: fileId,
          agreementType: agreementType as "Квартиры" | "Коммерция" | "Паркинг" | "Кладовка",
          ...(dealDocumentId && { deal: { connect: [dealDocumentId] } }),
        },
      },
      { headers }
    );

    return NextResponse.json({
      status: "ok",
      message: "agreement_created",
      ...(fileUrl && { fileUrl }),
      templateType: actualTemplateType,
      agreementNumber,
    });
  } catch (e: any) {
    console.error("signed-agreements/generate error:", e?.response?.data ?? e);
    return NextResponse.json(
      { status: "error", message: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
