// 类型定义
export type HealthResponse = { status: string };

export type VmAssetItem = {
  ip: string;
  hostname: string | null;
  department: string | null;
  lab: string | null;
  owner: string | null;
  os_type: string | null;
  status: string;
  last_rdp_login_at: string | null;
};

export type VmAssetListResponse = { items: VmAssetItem[] };

export type IdleSnapshotItem = {
  snapshot_date: string;
  ip: string;
  idle_days: number;
  owner: string | null;
  department: string | null;
  lab: string | null;
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

// apiFetch 泛型基础方法
const JSON_HEADERS = { Accept: "application/json" };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
  });
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
