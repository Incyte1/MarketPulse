const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

const SESSION_KEY = "marketpulse_session_v2";

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function storeSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;

  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function apiRequest<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;

    try {
      const parsed = JSON.parse(text) as { detail?: string };
      message = parsed.detail || text;
    } catch {
      message = text;
    }

    throw new Error(message || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function getStoredSession(): AuthSession | null {
  return readStoredSession();
}

export async function registerWithEmail(params: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(params),
  });
  storeSession(session);
  return session;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  storeSession(session);
  return session;
}

export async function restoreSession(): Promise<AuthSession | null> {
  const stored = readStoredSession();
  if (!stored?.token) return null;

  try {
    const user = await apiRequest<AuthUser>("/api/auth/me", { method: "GET" }, stored.token);
    const session = { token: stored.token, user };
    storeSession(session);
    return session;
  } catch {
    storeSession(null);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  const stored = readStoredSession();

  try {
    if (stored?.token) {
      await apiRequest<{ status: string }>("/api/auth/logout", { method: "POST", body: JSON.stringify({}) }, stored.token);
    }
  } catch {
    // Always clear the local session even if the backend token is already gone.
  } finally {
    storeSession(null);
  }
}
