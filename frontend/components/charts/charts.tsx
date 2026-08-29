"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ChartPoint } from "@/types";

const PRIMARY = "#2563eb";
const PRIMARY_LIGHT = "#93b8fb";
const SUCCESS = "#0f9d58";
const WARNING = "#f59e0b";
const DESTRUCTIVE = "#dc2626";
const MUTED = "#94a3b8";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid hsl(214 32% 89%)",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
};

export function ApplicationsOverviewChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="submittedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
            <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SUCCESS} stopOpacity={0.3} />
            <stop offset="100%" stopColor={SUCCESS} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214 32% 91%)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="submitted" name="Submitted" stroke={PRIMARY} fill="url(#submittedGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="approved" name="Approved" stroke={SUCCESS} fill="url(#approvedGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MonthlyRegistrationChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214 32% 91%)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(214 32% 96%)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="clients" name="Clients" fill={PRIMARY} radius={[6, 6, 0, 0]} />
        <Bar dataKey="staff" name="Staff" fill={PRIMARY_LIGHT} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PaymentAnalyticsChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214 32% 91%)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} />
        <Line type="monotone" dataKey="revenue" name="Revenue" stroke={PRIMARY} strokeWidth={2.5} dot={{ r: 3.5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = [SUCCESS, PRIMARY, WARNING, DESTRUCTIVE, MUTED];

export function ApplicationStatusPie({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
