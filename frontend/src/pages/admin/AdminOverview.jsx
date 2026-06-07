import React, { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#2C5545", "#1A2B4C", "#D96C4A", "#E8B458", "#5A6B82"];

export default function AdminOverview() {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminApi.get("/admin/analytics/overview").then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="text-clinic-mist">Loading…</div>;

  const intentData = Object.entries(data.intent_breakdown || {}).map(([name, value]) => ({ name, value }));
  const pageData = (data.top_pages || []).slice(0, 8);

  return (
    <div data-testid="admin-overview">
      <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">Overview</div>
      <h1 className="font-display text-3xl font-extrabold text-clinic-navy mt-2">Smart site at a glance</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Visitor sessions" value={data.total_sessions} />
        <Stat label="Leads" value={data.total_leads} />
        <Stat label="Signals tracked" value={data.total_signals} />
        <Stat label="Leads · last 7d" value={data.leads_last_7d} accent />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card title="Parent intents" testid="intent-pie">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={intentData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={4}>
                {intentData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            {intentData.map((d, i) => (
              <div key={d.name} className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-clinic-navy font-semibold">{d.name}</span>
                <span className="text-clinic-mist">({d.value})</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top pages" testid="top-pages-chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFE6D3" vertical={false} />
              <XAxis dataKey="page" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="views" fill="#2C5545" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Sub-intents" testid="sub-intents-list">
          <ul className="divide-y divide-sand-300/60">
            {Object.entries(data.sub_intent_breakdown || {}).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between py-2 text-sm">
                <span className="text-clinic-navy font-semibold">{k}</span>
                <span className="text-clinic-mist">{v}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false }) {
  return (
    <div className={`rounded-2xl p-6 border ${accent ? "bg-clinic-navy text-sand-50 border-clinic-navy" : "bg-white border-sand-300/60"}`}>
      <div className={`text-xs uppercase tracking-[0.16em] font-bold ${accent ? "text-clinic-amber" : "text-clinic-forest"}`}>{label}</div>
      <div className={`mt-2 font-display text-3xl font-extrabold ${accent ? "text-sand-50" : "text-clinic-navy"}`}>{value ?? "-"}</div>
    </div>
  );
}

function Card({ title, children, testid }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-sand-300/60" data-testid={testid}>
      <div className="font-display font-bold text-clinic-navy mb-4">{title}</div>
      {children}
    </div>
  );
}
