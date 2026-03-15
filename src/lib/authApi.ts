export class ApiError extends Error {
  status?: number;
  payload?: any;
  constructor(message: string, status?: number, payload?: any) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function handleUnauthorized(_status: number) {
  // Не сбрасываем на главную при 401 — пользователь остаётся на текущей странице
}

export async function apiPost<T>(url: string, body?: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new ApiError(data?.message || data?.error || "Request failed", res.status, data);
  }

  return data as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new ApiError(data?.message || data?.error || "Request failed", res.status, data);
  }

  return data as T;
}