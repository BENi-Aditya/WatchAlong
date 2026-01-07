type ApiErrorBody = { error?: string };

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getAuthToken() {
  return localStorage.getItem("sw_token");
}

export function setAuthToken(token: string | null) {
  if (!token) {
    localStorage.removeItem("sw_token");
    return;
  }
  localStorage.setItem("sw_token", token);
}

async function parseError(res: Response) {
  let body: ApiErrorBody | null = null;
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    body = null;
  }
  return body?.error || `Request failed (${res.status})`;
}

function apiBaseUrl() {
  const fromEnv = (import.meta as any)?.env?.VITE_API_ORIGIN as string | undefined;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim().replace(/\/$/, "");
  if ((import.meta as any)?.env?.DEV) return `http://${window.location.hostname}:8091`;
  return "";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const base = apiBaseUrl();
  const url = base ? `${base}${path.startsWith("/") ? path : `/${path}`}` : path;

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }

  return (await res.json()) as T;
}

export function wsUrl(pathWithQuery: string) {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const env = (import.meta as any)?.env;
  const fromEnv = env?.VITE_WS_ORIGIN as string | undefined;

  if (fromEnv && String(fromEnv).trim()) {
    const raw = String(fromEnv).trim().replace(/\/$/, "");
    if (raw.startsWith("ws://") || raw.startsWith("wss://")) return `${raw}${pathWithQuery}`;
    if (raw.startsWith("http://")) return `${raw.replace("http://", "ws://")}${pathWithQuery}`;
    if (raw.startsWith("https://")) return `${raw.replace("https://", "wss://")}${pathWithQuery}`;
    return `${proto}://${raw}${pathWithQuery}`;
  }

  if (env?.DEV) {
    return `${proto}://${window.location.hostname}:8091${pathWithQuery}`;
  }

  return `${proto}://${window.location.host}${pathWithQuery}`;
}
