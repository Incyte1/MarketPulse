const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type MemoSourceLink = {
  label: string;
  url: string;
  kind: string;
};

export type InvestmentMemo = {
  thesis: string;
  setup: string;
  risks: string;
  invalidation: string;
  execution_plan: string;
  source_links: MemoSourceLink[];
  updated_at: string;
};

export type WorkspaceSummary = {
  id: number;
  name: string;
  description: string;
  is_default: boolean;
  selected_symbol: string;
  selected_horizon: "short_term" | "long_term";
  watchlist_count: number;
  alert_count: number;
  updated_at: string;
};

export type WatchlistItem = {
  id: number;
  symbol: string;
  notes: string;
  sort_order: number;
  created_at: string;
};

export type AlertItem = {
  id: number;
  symbol: string;
  horizon: "short_term" | "long_term";
  rule_type: string;
  level: number;
  status: string;
  note: string;
  created_at: string;
};

export type WorkspaceDetailResponse = {
  workspace: WorkspaceSummary;
  watchlist: WatchlistItem[];
  alerts: AlertItem[];
  memo: InvestmentMemo;
};

async function workspaceRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

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

export async function fetchWorkspaces(token: string): Promise<WorkspaceSummary[]> {
  return workspaceRequest<WorkspaceSummary[]>("/api/workspaces", token, { method: "GET" });
}

export async function fetchWorkspaceDetail(token: string, workspaceId: number): Promise<WorkspaceDetailResponse> {
  return workspaceRequest<WorkspaceDetailResponse>(`/api/workspaces/${workspaceId}`, token, {
    method: "GET",
  });
}

export async function createWorkspace(
  token: string,
  payload: {
    name: string;
    description?: string;
    selected_symbol?: string;
    selected_horizon?: "short_term" | "long_term";
  }
): Promise<WorkspaceSummary> {
  return workspaceRequest<WorkspaceSummary>("/api/workspaces", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWorkspaceSelection(
  token: string,
  workspaceId: number,
  payload: {
    name?: string;
    description?: string;
    selected_symbol?: string;
    selected_horizon?: "short_term" | "long_term";
  }
): Promise<WorkspaceSummary> {
  return workspaceRequest<WorkspaceSummary>(`/api/workspaces/${workspaceId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function addWorkspaceSymbol(
  token: string,
  workspaceId: number,
  payload: {
    symbol: string;
    notes?: string;
  }
): Promise<WorkspaceDetailResponse> {
  return workspaceRequest<WorkspaceDetailResponse>(`/api/workspaces/${workspaceId}/watchlist`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeWorkspaceSymbol(
  token: string,
  workspaceId: number,
  symbol: string
): Promise<WorkspaceDetailResponse> {
  return workspaceRequest<WorkspaceDetailResponse>(
    `/api/workspaces/${workspaceId}/watchlist/${encodeURIComponent(symbol)}`,
    token,
    { method: "DELETE" }
  );
}

export async function addWorkspaceAlert(
  token: string,
  workspaceId: number,
  payload: {
    symbol: string;
    horizon: "short_term" | "long_term";
    rule_type: string;
    level: number;
    note?: string;
  }
): Promise<WorkspaceDetailResponse> {
  return workspaceRequest<WorkspaceDetailResponse>(`/api/workspaces/${workspaceId}/alerts`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeWorkspaceAlert(
  token: string,
  workspaceId: number,
  alertId: number
): Promise<WorkspaceDetailResponse> {
  return workspaceRequest<WorkspaceDetailResponse>(`/api/workspaces/${workspaceId}/alerts/${alertId}`, token, {
    method: "DELETE",
  });
}

export async function saveWorkspaceMemo(
  token: string,
  workspaceId: number,
  payload: {
    thesis: string;
    setup: string;
    risks: string;
    invalidation: string;
    execution_plan: string;
    source_links: MemoSourceLink[];
  }
): Promise<WorkspaceDetailResponse> {
  return workspaceRequest<WorkspaceDetailResponse>(`/api/workspaces/${workspaceId}/memo`, token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
