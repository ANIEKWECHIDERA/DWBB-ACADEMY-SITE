import { useState } from "react";
import { Activity, BarChart3, BookCopy, CreditCard } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Tabs } from "@/components/ui/tabs";
import { AdminFilterCombobox } from "@/features/admin/components/AdminFilterCombobox";
import { adminRanges } from "@/features/admin/constants";
import { AdminPanel, EmptyState, MetricCard } from "@/features/admin/components/AdminPrimitives";
import type { AdminRange } from "@/lib/admin-api";
import { formatCurrencyFromKobo } from "@/features/admin/utils";
import type { AdminDashboardMetrics } from "@/types/admin";

export function AdminOverviewSection({
  dashboard,
  range,
  setRange,
}: {
  dashboard: AdminDashboardMetrics | null;
  range: AdminRange;
  setRange: (range: AdminRange) => void;
}) {
  const [mobileOverviewView, setMobileOverviewView] = useState<"window" | "inflow">("window");

  return (
    <div className="space-y-6">
      <div className="space-y-4 lg:hidden">
        <AdminPanel className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Overview Workspace</p>
          <Tabs
            className="mt-4"
            items={["Window", "Inflow"]}
            onChange={(value) => setMobileOverviewView(value === "Inflow" ? "inflow" : "window")}
            value={mobileOverviewView === "inflow" ? "Inflow" : "Window"}
          />
          {mobileOverviewView === "window" ? (
            <div className="mt-4 grid gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Overview Window</p>
              <AdminFilterCombobox
                options={adminRanges.map((option) => ({ label: option.label, value: option.value }))}
                onChange={(value) => setRange(value as AdminRange)}
                placeholder="Select time range"
                searchPlaceholder="Filter ranges..."
                value={range}
              />
            </div>
          ) : (
            <div className="mt-4">
              {!dashboard || dashboard.inflowOverTime.length === 0 ? (
                <EmptyState title="No inflow data yet" description="Verified payments will populate the inflow chart here." compact />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer height="100%" width="100%">
                    <AreaChart data={dashboard.inflowOverTime}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                      <Tooltip formatter={(value) => formatCurrencyFromKobo(Number(value || 0))} />
                      <Legend />
                      <Area dataKey="grossSalesKobo" fill="#f2c94c" fillOpacity={0.25} name="Gross sales" stroke="#d4a514" />
                      <Area dataKey="netInflowKobo" fill="#33a7ff" fillOpacity={0.2} name="Net inflow" stroke="#0f6dc5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </AdminPanel>
      </div>

      <AdminPanel className="hidden p-4 lg:block">
        <div className="grid gap-3 sm:max-w-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Overview Window</p>
          <AdminFilterCombobox
            options={adminRanges.map((option) => ({ label: option.label, value: option.value }))}
            onChange={(value) => setRange(value as AdminRange)}
            placeholder="Select time range"
            searchPlaceholder="Filter ranges..."
            value={range}
          />
        </div>
      </AdminPanel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Activity} label="Gross Sales" value={formatCurrencyFromKobo(dashboard?.grossSalesKobo || 0)} />
        <MetricCard icon={BarChart3} label="Net Inflow" value={formatCurrencyFromKobo(dashboard?.netInflowKobo || 0)} />
        <MetricCard icon={CreditCard} label="Transactions" value={String(dashboard?.totalTransactions || 0)} />
        <MetricCard icon={BookCopy} compact label="Top Selling Course" value={dashboard?.topSellingCourse?.courseTitle || "No payments yet"} />
      </div>

      {!dashboard || (dashboard.inflowOverTime.length === 0 && dashboard.salesByCourse.length === 0) ? (
        <EmptyState title="No overview data yet" description="Once verified payments start flowing in, inflow charts and KPI insights will appear here." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <AdminPanel className="hidden lg:block">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Inflow Over Time</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-950">Gross sales vs net inflow</h3>
              </div>
            </div>
            <div className="mt-6 h-64 sm:h-80">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={dashboard.inflowOverTime}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                  <Tooltip formatter={(value) => formatCurrencyFromKobo(Number(value || 0))} />
                  <Legend />
                  <Area dataKey="grossSalesKobo" fill="#f2c94c" fillOpacity={0.25} name="Gross sales" stroke="#d4a514" />
                  <Area dataKey="netInflowKobo" fill="#33a7ff" fillOpacity={0.2} name="Net inflow" stroke="#0f6dc5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AdminPanel>

          <AdminPanel>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Sales By Course</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">Course demand snapshot</h3>
            <div className="mt-6 h-64 sm:h-80">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={dashboard.salesByCourse}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="courseTitle" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value, key) => (String(key) === "transactions" ? Number(value || 0) : formatCurrencyFromKobo(Number(value || 0)))} />
                  <Bar dataKey="transactions" fill="#0f172a" name="Transactions" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AdminPanel>
        </div>
      )}
    </div>
  );
}
