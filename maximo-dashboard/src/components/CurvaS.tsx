import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CurvaSPoint } from '../lib/kpi';

export function CurvaS({ data }: { data: CurvaSPoint[] }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="mb-2 text-sm font-semibold">Curva S acumulada</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
            <Legend />
            <Line type="monotone" dataKey="pctPlan" name="% Plan" stroke="#60a5fa" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="pctReal" name="% Real" stroke="#16a34a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
