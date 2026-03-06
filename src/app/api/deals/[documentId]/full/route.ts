import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

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

    let effectiveRole: string = payload.role ?? "customer";
    if (effectiveRole !== "manager" && effectiveRole !== "admin") {
      const base = getStrapiBaseUrl().replace(/\/$/, "").replace(/\/api\/?$/, "");
      const headers = getStrapiHeaders();
      const customerRes = await strapiAxios
        .get(`${base}/api/customers?filters[id][$eq]=${payload.sub}&pagination[pageSize]=1&fields[0]=role`, { headers })
        .catch(() => null);
      const customer: any = (customerRes?.data as any)?.data?.[0];
      effectiveRole = customer?.role ?? customer?.attributes?.role ?? effectiveRole;
    }
    const isManager = effectiveRole === "manager" || effectiveRole === "admin";
    if (!isManager) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { documentId } = await params;
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${documentId}` +
        "?populate[property][populate][project][fields][0]=projectName&populate[property][populate][project][fields][1]=documentId&populate[property][fields][0]=house&populate[property][fields][1]=entrance&populate[property][fields][2]=apartmentNumber&populate[property][fields][3]=totalArea&populate[property][fields][4]=section&populate[property][fields][5]=room" +
        "&populate[customer][fields][0]=name&populate[customer][fields][1]=surname&populate[customer][fields][2]=phone&populate[customer][fields][3]=email&populate[customer][fields][4]=iin&populate[customer][fields][5]=birthDate&populate[customer][fields][6]=docNumber&populate[customer][fields][7]=docIssuer&populate[customer][fields][8]=dateIssue&populate[customer][fields][9]=address" +
        "&populate[manager][fields][0]=id",
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });

    const managerId = deal?.manager?.id ?? deal?.attributes?.manager?.id ?? (deal?.manager as any)?.data?.id;
    const isDealManager = managerId != null && Number(managerId) === Number(payload.sub);
    if (effectiveRole === "manager" && !isDealManager) {
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
      `${base}/api/signed-agreements?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}&sort[0]=createdAt:desc&pagination[pageSize]=1&fields[0]=signed&fields[1]=signedAt`,
      { headers }
    ).catch(() => ({ data: {} }));
    const saList: any[] = (saRes.data as any)?.data ?? [];
    const sa = Array.isArray(saList) ? saList[0] : null;

    const prop = deal?.property ?? deal?.attributes?.property;
    const propData = (prop as any)?.data ?? prop;
    const cust = deal?.customer ?? deal?.attributes?.customer;
    const custData = (cust as any)?.data ?? cust;

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
        property: propData
          ? {
              documentId: propData?.documentId ?? propData?.id,
              projectName: propData?.project?.projectName ?? propData?.project?.attributes?.projectName,
              projectDocumentId: propData?.project?.documentId ?? propData?.project?.id,
              apartmentNumber: propData?.apartmentNumber,
              totalArea: propData?.totalArea,
              priceCheckmate: propData?.priceCheckmate,
              room: propData?.room,
              house: propData?.house,
              entrance: propData?.entrance,
              section: propData?.section,
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
    });
  } catch (err: any) {
    if (err?.response?.status === 404) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });
    console.error("[deals/full]", err?.response?.data ?? err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
