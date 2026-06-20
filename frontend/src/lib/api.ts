// 类型定义
export type HealthResponse = { status: string };

export type VmAssetItem = {
  ip: string;
  hostname: string | null;
  department: string | null;
  owner: string | null;
  phone: string | null;
  mobile: string | null;
  os_type: string | null;
  status: string;
  last_rdp_login_at: string | null;
};

export type VmAssetPerfItem = VmAssetItem & {
  idle_days: number;
  cpu_avg: number | null;
  mem_avg: number | null;
  recommendation: string;
};

export type VmAssetListResponse = { items: VmAssetItem[] };
export type VmAssetPerfListResponse = { items: VmAssetPerfItem[] };

export type IdleSnapshotItem = {
  snapshot_date: string;
  ip: string;
  idle_days: number;
  owner: string | null;
  department: string | null;
  recycle_level: string;
  reason: string | null;
  last_rdp_login_at: string | null;
};

export type IdleSnapshotListResponse = { items: IdleSnapshotItem[] };

export type RdpTrendPoint = { bucket: string; login_count: number };
export type TrendGranularity = "day" | "week" | "month";
export type RdpTrendResponse = {
  code: number;
  message: string;
  data: { granularity: string; series: RdpTrendPoint[] };
};

export type RdpLoginItem = {
  id: number;
  ip: string;
  login_at: string;
  username: string | null;
};

export type RdpLoginListResponse = {
  items: RdpLoginItem[];
  total: number;
};

export type AdviceItem = {
  ip: string;
  rating: string;
  summary: string;
  details: string[];
  score?: number;
};

export type AdviceResponse = {
  items: AdviceItem[];
};

export type TestConnectionResponse = {
  ok: boolean;
  message: string;
};

export type SettingsResponse = {
  settings: Record<string, string>;
};



export type PerfHostItem = {
  ip: string;
  cpu: number | null;
  mem: number | null;
};

export type PerfOverviewResponse = {
  hosts: PerfHostItem[];
};

export type PerfTrendPoint = { clock: number; value_avg: number };

export type PerfTrendData = {
  cpu: PerfTrendPoint[];
  mem: PerfTrendPoint[];
};

export type PerfTrendResponse = {
  code: number;
  message: string;
  data: PerfTrendData;
};

// apiFetch 泛型基础方法
const JSON_HEADERS: Record<string, string> = { Accept: "application/json" };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...JSON_HEADERS,
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.body) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, {
    ...init,
    headers,
  });
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as T;
}

// 导出接口函数
export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

export async function getVmAssets(): Promise<VmAssetListResponse> {
  return apiFetch<VmAssetListResponse>("/api/assets");
}

export async function getVmAssetsWithPerf(): Promise<VmAssetPerfListResponse> {
  return apiFetch<VmAssetPerfListResponse>("/api/assets/perf");
}

export async function getIdleSnapshots(): Promise<IdleSnapshotListResponse> {
  return apiFetch<IdleSnapshotListResponse>("/api/v1/idle");
}

export async function getRdpTrends(
  granularity: TrendGranularity = "day",
): Promise<RdpTrendResponse> {
  return apiFetch<RdpTrendResponse>(
    `/api/v1/rdp/trends?granularity=${granularity}`,
  );
}

export function getIdleExportUrl(): string {
  return "/api/v1/idle/export";
}

export async function getRdpLogins(
  limit: number = 50,
  offset: number = 0,
): Promise<RdpLoginListResponse> {
  return apiFetch<RdpLoginListResponse>(
    `/api/v1/rdp/logins?limit=${limit}&offset=${offset}`,
  );
}

export async function getSettings(): Promise<SettingsResponse> {
  return apiFetch<SettingsResponse>("/api/v1/settings");
}

export async function updateSettings(settings: Record<string, string>): Promise<SettingsResponse> {
  return apiFetch<SettingsResponse>("/api/v1/settings", {
    method: "PUT",
    body: JSON.stringify({ settings }),
  });
}

export async function getLLMApiKey(): Promise<{ api_key: string }> {
  return apiFetch<{ api_key: string }>("/api/v1/settings/llm-api-key");
}

export async function getAiAdvice(hosts: any[]): Promise<AdviceResponse> {
  return apiFetch<AdviceResponse>("/api/v1/ai/advice", {
    method: "POST",
    body: JSON.stringify({ hosts }),
  });
}



export async function getPerfOverview(): Promise<PerfOverviewResponse> {
  return apiFetch<PerfOverviewResponse>("/api/v1/perf/overview");
}

export async function getPerfTrends(ip: string): Promise<PerfTrendResponse> {
  return apiFetch<PerfTrendResponse>(`/api/v1/perf/trends?ip=${encodeURIComponent(ip)}`);
}

export async function testAiConnection(): Promise<TestConnectionResponse> {
  return apiFetch<TestConnectionResponse>("/api/v1/ai/test-connection", {
    method: "POST",
  });
}
