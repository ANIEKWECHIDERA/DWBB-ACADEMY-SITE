import { Activity, BarChart3, BookCopy, CreditCard } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { MetricCard, EmptyState, AdminPanel } from "@/features/admin/components/AdminPrimitives";
import { formatCurrencyFromKobo } from "@/features/admin/utils";
import type { AdminDashboardMetrics } from "@/types/admin";

export function AdminOverviewSection({ dashboard }: { dashboard: AdminDashboardMetrics | null }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Activity} label="Gross Sales" value={formatCurrencyFromKobo(dashboard?.grossSalesKobo || 0)} />
        <MetricCard icon={BarChart3} label="Net Inflow" value={formatCurrencyFromKobo(dashboard?.netInflowKobo || 0)} />
        <MetricCard icon={CreditCard} label="Transactions" value={String(dashboard?.totalTransactions || 0)} />
        <MetricCard icon={BookCopy} label="Top Selling Course" value={dashboard?.topSellingCourse?.courseTitle || "No payments yet"} compact />
      </div>

      {!dashboard || (dashboard.inflowOverTime.length === 0 && dashboard.salesByCourse.length === 0) ? (
        <EmptyState title="No overview data yet" description="Once verified payments start flowing in, inflow charts and KPI insights will appear here." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <AdminPanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Inflow Over Time</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-950">Gross sales vs net inflow</h3>
              </div>
            </div>
            <div className="mt-6 h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.inflowOverTime}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                  <Tooltip formatter={(value) => formatCurrencyFromKobo(Number(value || 0))} />
                  <Legend />
                  <Area dataKey="grossSalesKobo" name="Gross sales" fill="#f2c94c" stroke="#d4a514" fillOpacity={0.25} />
                  <Area dataKey="netInflowKobo" name="Net inflow" fill="#33a7ff" stroke="#0f6dc5" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AdminPanel>

          <AdminPanel>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Sales By Course</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">Course demand snapshot</h3>
            <div className="mt-6 h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.salesByCourse}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="courseTitle" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value, key) => (String(key) === "transactions" ? Number(value || 0) : formatCurrencyFromKobo(Number(value || 0)))} />
                  <Bar dataKey="transactions" name="Transactions" fill="#0f172a" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AdminPanel>
        </div>
      )}
    </div>
  );
}
