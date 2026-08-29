import { api } from "./api";
import type { ChartPoint } from "@/types";

export async function applicationsOverTime(): Promise<ChartPoint[]> {
  const { data } = await api.get<Array<{ name: string; value: number }>>(
    "/reports/applications-over-time",
  );
  return data.map((d) => ({ name: d.name, submitted: d.value, value: d.value }));
}

export async function paymentsOverTime(): Promise<ChartPoint[]> {
  const { data } = await api.get<Array<{ name: string; value: number }>>(
    "/reports/payments-over-time",
  );
  return data.map((d) => ({ name: d.name, revenue: d.value, value: d.value }));
}

export async function applicationStatusBreakdown(): Promise<ChartPoint[]> {
  const { data } = await api.get<Array<{ name: string; value: number }>>(
    "/reports/application-status-breakdown",
  );
  return data;
}

interface RawActivity {
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  createdAt: string;
}

export interface RecentActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export async function recentActivity(): Promise<RecentActivityItem[]> {
  const { data } = await api.get<RawActivity[]>("/reports/recent-activity");
  return data.map((a, i) => ({
    id: `${a.actorId}-${i}`,
    actor: a.actorName,
    action: a.action,
    target: a.target,
    time: timeAgo(a.createdAt),
  }));
}
