import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

/**
 * PUT /api/queue/manager/status
 * Body: { status: "AVAILABLE" | "OFFLINE" | "BREAK" | "LUNCH" }
 *
 * Для AVAILABLE вызывает queue-backend /auth/manager/shift/start (использует менеджера из токена).
 * Для остальных статусов использует старый маршрут /managers/:id/status.
 */
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { status?: string; managerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const status = body?.status?.toUpperCase?.();
  if (!status || !["AVAILABLE", "OFFLINE", "BREAK", "LUNCH"].includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  // Для AVAILABLE используем корректный маршрут начала смены.
  if (status === "AVAILABLE") {
    try {
      // Business rule: менеджер не может стать AVAILABLE, пока у его филиала нет открытой смены.
      // Проверяем "current shift" по branchId (если backend отдаёт информацию).
      try {
        const meRes = await fetch(`${QUEUE_API_URL}/api/auth/manager/me`, {
          headers: { Authorization: `Bearer ${access}` },
        });

        const meData = await meRes.json().catch(() => ({}));
        const branchId =
          meData?.data?.branch?.id ??
          (meData?.data as any)?.branchId ??
          meData?.data?.branch?.documentId ??
          null;

        if (branchId) {
          const shiftRes = await fetch(
            `${QUEUE_API_URL}/api/admin/shifts/current?branchId=${encodeURIComponent(String(branchId))}`,
            {
              method: "GET",
              headers: { Authorization: `Bearer ${access}` },
            },
          );

          const shiftData = await shiftRes.json().catch(() => ({}));

          // ожидаем: { success: boolean, data: null | { id, status, ... } }
          if (shiftRes.ok) {
            const hasActiveShift = shiftData?.data != null;
            if (!hasActiveShift) {
              return NextResponse.json(
                {
                  error: "SHIFT_CLOSED",
                  message: "Сначала откройте смену филиала",
                },
                { status: 409 },
              );
            }
          }
        }
      } catch {
        // Если проверка смены не удалась по инфраструктурным причинам —
        // не ломаем управление, но базовое правило всё равно должно работать на backend.
      }

      const res = await fetch(`${QUEUE_API_URL}/api/auth/manager/shift/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(data || { error: "queue_error" }, { status: res.status });
      }
      return NextResponse.json(data);
    } catch (e) {
      console.error("[queue/manager/status AVAILABLE]", e);
      return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
    }
  }

  // Для OFFLINE завершаем смену менеджера.
  if (status === "OFFLINE") {
    try {
      const res = await fetch(`${QUEUE_API_URL}/api/auth/manager/shift/end`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(data || { error: "queue_error" }, { status: res.status });
      }
      return NextResponse.json(data);
    } catch (e) {
      console.error("[queue/manager/status OFFLINE]", e);
      return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
    }
  }

  // Для остальных статусов сохраняем прежнюю логику.
  let managerId = body.managerId;
  if (!managerId) {
    const meRes = await fetch(`${QUEUE_API_URL}/api/auth/manager/me`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!meRes.ok) {
      const data = await meRes.json().catch(() => ({}));
      return NextResponse.json(data || { error: "queue_error" }, { status: meRes.status });
    }
    const meData = await meRes.json();
    managerId = meData?.data?.id;
  }
  if (!managerId) return NextResponse.json({ error: "manager_id_required" }, { status: 400 });

  try {
    const res = await fetch(`${QUEUE_API_URL}/api/managers/${encodeURIComponent(managerId)}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data || { error: "queue_error" }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("[queue/manager/status]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
