import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { resolveEffectiveRole } from "@/lib/dealManagerAuth";

type RealEstateType = "property" | "commerce" | "parking" | "pantry";
const TYPE_LABEL: Record<RealEstateType, string> = {
  property: "Квартира",
  commerce: "Коммерция",
  parking: "Паркинг",
  pantry: "Кладовка",
};

/**
 * GET: полные данные сделки для модалки Kanban (property, customer, payment-schedules, payments).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const origin = getStrapiBaseUrl().replace(/\/$/, "").replace(/\/api\/?$/, "");
    const originHeaders = getStrapiHeaders();
    const effectiveRole = await resolveEffectiveRole(payload, origin, originHeaders);
    const roleLower = String(effectiveRole ?? "").toLowerCase();
    const isManager = roleLower === "manager" || roleLower === "admin" || roleLower === "rop";
    const isCashier = roleLower === "cashier" || roleLower === "cshier";
    const isLawyer = roleLower === "lawyer";
    if (!isManager && !isCashier && !isLawyer) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { documentId } = await params;
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${documentId}` +
        "?populate[property][populate][project][fields][0]=projectName&populate[property][populate][project][fields][1]=documentId&populate[property][fields][0]=house&populate[property][fields][1]=entrance&populate[property][fields][2]=apartmentNumber&populate[property][fields][3]=totalArea&populate[property][fields][4]=section&populate[property][fields][5]=room" +
        "&populate[commerce][populate][project][fields][0]=projectName&populate[commerce][populate][project][fields][1]=documentId" +
        "&populate[parking][populate][project][fields][0]=projectName&populate[parking][populate][project][fields][1]=documentId" +
        "&populate[pantry][populate][project][fields][0]=projectName&populate[pantry][populate][project][fields][1]=documentId" +
        "&populate[customer][fields][0]=name&populate[customer][fields][1]=surname&populate[customer][fields][2]=phone&populate[customer][fields][3]=email&populate[customer][fields][4]=iin&populate[customer][fields][5]=birthDate&populate[customer][fields][6]=docNumber&populate[customer][fields][7]=docIssuer&populate[customer][fields][8]=dateIssue&populate[customer][fields][9]=address" +
        "&populate[manager][fields][0]=id&populate[manager][fields][1]=name&populate[manager][fields][2]=surname&populate[manager][fields][3]=phone" +
        "&populate[kazreestrRequestLogs][sort][0]=respondedAt:desc&populate[kazreestrRequestLogs][sort][1]=sentAt:desc&populate[kazreestrRequestLogs][sort][2]=createdAt:desc",
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });

    const managerId = deal?.manager?.id ?? deal?.attributes?.manager?.id ?? (deal?.manager as any)?.data?.id;
    const isDealManager = managerId != null && Number(managerId) === Number(payload.sub);
    if (roleLower === "manager" && !isDealManager) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const scheduleRes = await strapiAxios.get(
      `${base}/api/payment-schedules?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}&sort[0]=index:asc&pagination[pageSize]=100&fields[0]=index&fields[1]=dueDate&fields[2]=amount&fields[3]=paymentStatus`,
      { headers }
    ).catch(() => ({ data: {} }));
    const scheduleList: any[] = (scheduleRes.data as any)?.data ?? [];

    const paymentsRes = await strapiAxios.get(
      `${base}/api/payments?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}&sort[0]=createdAt:desc&pagination[pageSize]=50&fields[0]=amount&fields[1]=paymentStatus&fields[2]=createdAt`,
      { headers }
    ).catch(() => ({ data: {} }));
    const paymentsList: any[] = (paymentsRes.data as any)?.data ?? [];

    const saRes = await strapiAxios.get(
      `${base}/api/signed-agreements?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}&sort[0]=createdAt:desc&pagination[pageSize]=100&fields[0]=signed&fields[1]=signedAt&fields[2]=templateType&fields[3]=agreementType&fields[4]=agreementNumber&fields[5]=sendToKazreestr&fields[6]=createdAt`,
      { headers }
    ).catch(() => ({ data: {} }));
    const saList: any[] = (saRes.data as any)?.data ?? [];
    const sa = Array.isArray(saList) ? saList[0] : null;
    const signedAgreementsList = (Array.isArray(saList) ? saList : []).map((row: any) => ({
      documentId: String(row?.documentId ?? row?.attributes?.documentId ?? row?.id ?? ""),
      templateType: (row?.templateType ?? row?.attributes?.templateType ?? null) as string | null,
      agreementType: (row?.agreementType ?? row?.attributes?.agreementType ?? null) as string | null,
      agreementNumber: (row?.agreementNumber ?? row?.attributes?.agreementNumber ?? null) as string | null,
      signed: Boolean(row?.signed ?? row?.attributes?.signed ?? false),
      signedAt: (row?.signedAt ?? row?.attributes?.signedAt ?? null) as string | null,
      sendToKazreestr: Boolean(row?.sendToKazreestr ?? row?.attributes?.sendToKazreestr ?? false),
      createdAt: (row?.createdAt ?? row?.attributes?.createdAt ?? null) as string | null,
    })).filter((row) => row.documentId);

    const logsFromDealRelationRaw =
      deal?.kazreestrRequestLogs ??
      deal?.attributes?.kazreestrRequestLogs ??
      null;
    const logsFromDealRelation: any[] =
      ((logsFromDealRelationRaw as any)?.data as any[]) ??
      (Array.isArray(logsFromDealRelationRaw) ? logsFromDealRelationRaw : []);

    const logsQueryTail =
      `filters[status][$in][0]=sent&filters[status][$in][1]=success&filters[status][$in][2]=failed&filters[status][$in][3]=error` +
      `&sort[0]=respondedAt:desc&sort[1]=sentAt:desc&sort[2]=createdAt:desc&pagination[pageSize]=50`;
    const dealIdForFilter = deal?.id ?? deal?.attributes?.id;
    const kazreestrLogResByDocId = await strapiAxios.get(
      `${base}/api/kazreestr-request-logs?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}&${logsQueryTail}`,
      { headers }
    ).catch(() => ({ data: {} }));
    let kazreestrLogList: any[] =
      logsFromDealRelation.length > 0 ? logsFromDealRelation : ((kazreestrLogResByDocId.data as any)?.data ?? []);
    if (kazreestrLogList.length === 0 && dealIdForFilter != null) {
      const kazreestrLogResByDealId = await strapiAxios.get(
        `${base}/api/kazreestr-request-logs?filters[deal][id][$eq]=${encodeURIComponent(String(dealIdForFilter))}&${logsQueryTail}`,
        { headers }
      ).catch(() => ({ data: {} }));
      kazreestrLogList = (kazreestrLogResByDealId.data as any)?.data ?? [];
    }
    const normalizeResponsePayload = (raw: unknown): Record<string, unknown> | null => {
      if (!raw) return null;
      if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
        } catch {
          return null;
        }
      }
      return null;
    };
    const extractNameRu = (payload: Record<string, unknown> | null): string | null => {
      if (!payload) return null;
      const direct = payload.nameRu;
      if (typeof direct === "string" && direct.trim()) return direct.trim();
      const dataNode = payload.data;
      if (dataNode && typeof dataNode === "object" && !Array.isArray(dataNode)) {
        const nested = (dataNode as Record<string, unknown>).nameRu;
        if (typeof nested === "string" && nested.trim()) return nested.trim();
      }
      const resultNode = payload.result;
      if (resultNode && typeof resultNode === "object" && !Array.isArray(resultNode)) {
        const nested = (resultNode as Record<string, unknown>).nameRu;
        if (typeof nested === "string" && nested.trim()) return nested.trim();
      }
      return null;
    };
    const normalizedLogs = (Array.isArray(kazreestrLogList) ? kazreestrLogList : []).map((row: any) => {
      const status = row?.status ?? row?.attributes?.status ?? null;
      const operationType = row?.operationType ?? row?.attributes?.operationType ?? null;
      const httpStatus = row?.httpStatus ?? row?.attributes?.httpStatus ?? null;
      const sentAt = row?.sentAt ?? row?.attributes?.sentAt ?? null;
      const respondedAt = row?.respondedAt ?? row?.attributes?.respondedAt ?? null;
      const messageId = row?.messageId ?? row?.attributes?.messageId ?? null;
      const responsePayloadRaw = row?.responsePayload ?? row?.attributes?.responsePayload ?? null;
      const normalizedPayload = normalizeResponsePayload(responsePayloadRaw);
      return {
        status,
        operationType,
        httpStatus,
        sentAt,
        respondedAt,
        messageId,
        responsePayload: normalizedPayload,
        responseNameRu: extractNameRu(normalizedPayload),
      };
    }).filter((row: any) => ["sent", "success", "failed", "error"].includes(String(row?.status ?? "")));
    const latestKazreestrLog =
      normalizedLogs.find((row: any) => typeof row?.responseNameRu === "string" && row.responseNameRu.trim()) ??
      normalizedLogs[0] ??
      null;

    const propertyData = ((deal?.property ?? deal?.attributes?.property) as any)?.data ?? deal?.property ?? deal?.attributes?.property;
    const commerceData = ((deal?.commerce ?? deal?.attributes?.commerce) as any)?.data ?? deal?.commerce ?? deal?.attributes?.commerce;
    const parkingData = ((deal?.parking ?? deal?.attributes?.parking) as any)?.data ?? deal?.parking ?? deal?.attributes?.parking;
    const pantryData = ((deal?.pantry ?? deal?.attributes?.pantry) as any)?.data ?? deal?.pantry ?? deal?.attributes?.pantry;
    const selected =
      (propertyData && { type: "property" as const, entity: propertyData }) ||
      (commerceData && { type: "commerce" as const, entity: commerceData }) ||
      (parkingData && { type: "parking" as const, entity: parkingData }) ||
      (pantryData && { type: "pantry" as const, entity: pantryData }) ||
      null;
    const selectedType: RealEstateType = selected?.type ?? "property";
    const selectedEntity: any = selected?.entity ?? null;
    const numberFieldByType: Record<RealEstateType, string> = {
      property: "apartmentNumber",
      commerce: "commerceNumber",
      parking: "parkingNumber",
      pantry: "numberPantry",
    };
    const cust = deal?.customer ?? deal?.attributes?.customer;
    const custData = (cust as any)?.data ?? cust;
    const mgr = deal?.manager ?? deal?.attributes?.manager;
    const mgrData = (mgr as any)?.data ?? mgr;
    const managerName = mgrData?.name ?? mgrData?.attributes?.name ?? "";
    const managerSurname = mgrData?.surname ?? mgrData?.attributes?.surname ?? "";
    const managerPhone = mgrData?.phone ?? mgrData?.attributes?.phone ?? "";
    const managerDisplayName = [managerSurname, managerName].filter(Boolean).join(" ").trim();

    return NextResponse.json({
      deal: {
        id: deal?.id ?? deal?.attributes?.id,
        documentId: deal?.documentId ?? deal?.id,
        dealStatus: deal?.dealStatus ?? deal?.attributes?.dealStatus,
        dealPrice: deal?.dealPrice ?? deal?.attributes?.dealPrice,
        downPayment: deal?.downPayment ?? deal?.attributes?.downPayment,
        reserveSum: deal?.reserveSum ?? deal?.attributes?.reserveSum,
        expiresAt: deal?.expiresAt ?? deal?.attributes?.expiresAt,
        paymentMethod: deal?.paymentMethod ?? deal?.attributes?.paymentMethod,
        kazreestrStatus: deal?.kazreestrStatus ?? deal?.attributes?.kazreestrStatus ?? null,
        baseContractType: deal?.baseContractType ?? deal?.attributes?.baseContractType ?? null,
        realEstateType: selectedType,
        property: selectedEntity
          ? {
              documentId: selectedEntity?.documentId ?? selectedEntity?.id,
              projectName: selectedEntity?.project?.projectName ?? selectedEntity?.project?.attributes?.projectName,
              projectDocumentId: selectedEntity?.project?.documentId ?? selectedEntity?.project?.id,
              apartmentNumber: selectedEntity?.[numberFieldByType[selectedType]],
              totalArea: selectedEntity?.totalArea ?? selectedEntity?.area ?? selectedEntity?.areaGroup,
              priceCheckmate: selectedEntity?.priceCheckmate,
              room: selectedType === "property" ? selectedEntity?.room : undefined,
              house: selectedEntity?.house,
              entrance: selectedEntity?.entrance,
              section: selectedEntity?.section,
              type: selectedType,
              typeLabel: TYPE_LABEL[selectedType],
            }
          : null,
        customer: custData
          ? {
              documentId: custData?.documentId ?? custData?.id,
              name: custData?.name ?? custData?.attributes?.name,
              surname: custData?.surname ?? custData?.attributes?.surname,
              phone: custData?.phone ?? custData?.attributes?.phone,
              email: custData?.email ?? custData?.attributes?.email,
              iin: custData?.iin ?? custData?.attributes?.iin,
              birthDate: custData?.birthDate ?? custData?.attributes?.birthDate,
              docNumber: custData?.docNumber ?? custData?.attributes?.docNumber,
              docIssuer: custData?.docIssuer ?? custData?.attributes?.docIssuer,
              dateIssue: custData?.dateIssue ?? custData?.attributes?.dateIssue,
              address: custData?.address ?? custData?.attributes?.address,
            }
          : null,
        manager: mgrData
          ? {
              name: managerName || undefined,
              surname: managerSurname || undefined,
              phone: managerPhone || undefined,
              displayName: managerDisplayName || undefined,
            }
          : null,
      },
      paymentSchedules: scheduleList.map((r: any) => ({
        index: r?.index ?? r?.attributes?.index,
        dueDate: r?.dueDate ?? r?.attributes?.dueDate,
        amount: r?.amount ?? r?.attributes?.amount,
        paymentStatus: r?.paymentStatus ?? r?.attributes?.paymentStatus,
      })),
      payments: paymentsList.map((p: any) => ({
        amount: p?.amount ?? p?.attributes?.amount,
        paymentStatus: p?.paymentStatus ?? p?.attributes?.paymentStatus,
        createdAt: p?.createdAt ?? p?.attributes?.createdAt,
      })),
      signedAgreement: sa
        ? { signed: sa?.signed ?? sa?.attributes?.signed, signedAt: sa?.signedAt ?? sa?.attributes?.signedAt }
        : null,
      signedAgreements: signedAgreementsList,
      latestKazreestrRequestLog: latestKazreestrLog
        ? {
            status: latestKazreestrLog.status ?? null,
            responsePayload: latestKazreestrLog.responsePayload ?? null,
          }
        : null,
      kazreestrRequestLogs: normalizedLogs.map((row: any) => ({
        status: row.status ?? null,
        operationType: row.operationType ?? null,
        httpStatus: row.httpStatus ?? null,
        sentAt: row.sentAt ?? null,
        respondedAt: row.respondedAt ?? null,
        messageId: row.messageId ?? null,
        responsePayload: row.responsePayload ?? null,
      })),
    });
  } catch (err: any) {
    if (err?.response?.status === 404) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });
    console.error("[deals/full]", err?.response?.data ?? err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
