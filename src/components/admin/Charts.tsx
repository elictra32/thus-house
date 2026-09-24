"use client";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const PALETTE = ["#8b5cf6", "#22c55e", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6"];
const axis = { stroke: "#737988", fontSize: 11, tickLine: false, axisLine: false };
const tooltip = {
  contentStyle: { background: "#171a21", border: "1px solid #292d38", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#f4f5f7" },
};
const bahtFmt = (v: number) => "฿" + v.toLocaleString("th-TH");

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 font-bold">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

export function LineSeries({
  data, x, y, money, color = PALETTE[0],
}: { data: Record<string, unknown>[]; x: string; y: string; money?: boolean; color?: string }) {
  return (
    <ResponsiveContainer>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 4 }}>
        <CartesianGrid stroke="#20232b" vertical={false} />
        <XAxis dataKey={x} {...axis} tickFormatter={(v: string) => v.slice(5)} minTickGap={16} />
        <YAxis {...axis} width={money ? 64 : 32} tickFormatter={money ? bahtFmt : undefined} allowDecimals={false} />
        <Tooltip {...tooltip} formatter={(v) => (money ? bahtFmt(Number(v)) : String(v))} />
        <Line type="monotone" dataKey={y} stroke={color} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarSeries({
  data, x, y, money,
}: { data: Record<string, unknown>[]; x: string; y: string; money?: boolean }) {
  return (
    <ResponsiveContainer>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 4 }}>
        <CartesianGrid stroke="#20232b" vertical={false} />
        <XAxis dataKey={x} {...axis} />
        <YAxis {...axis} width={money ? 64 : 32} tickFormatter={money ? bahtFmt : undefined} allowDecimals={false} />
        <Tooltip {...tooltip} cursor={{ fill: "#ffffff08" }} formatter={(v) => (money ? bahtFmt(Number(v)) : String(v))} />
        <Bar dataKey={y} fill={PALETTE[0]} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data }: { data: { name: string; value: number }[] }) {
  const has = data.some((d) => d.value > 0);
  if (!has) return <p className="grid h-full place-items-center text-sm text-muted">ยังไม่มีข้อมูล</p>;
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip {...tooltip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
