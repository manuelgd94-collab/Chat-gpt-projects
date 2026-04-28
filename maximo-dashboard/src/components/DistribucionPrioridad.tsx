import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PrioridadBucket } from '../lib/kpi';
import { CopyCsvButton } from './CopyCsvButton';
import { fmtPct } from '../lib/format';

interface Props {
  data: PrioridadBucket[];
}

export function DistribucionPrioridad({ data }: Props) {
  const csvRows = data.map((d) => [d.label, d.plan, d.real, fmtPct(d.ratio)]);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold">Distribución por Prioridad</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            OTs programadas en la semana, agrupadas por prioridad (P1 = más urgente).
          </div>
        </div>
        <CopyCsvButton headers={['Prioridad', 'Plan', 'Real', '%Cumpl']} rows={csvRows} />
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-slate-500 py-8 text-center">Sin datos.</div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={80} />
              <Tooltip />
              <Legend />
              <Bar dataKey="plan" name="Plan" fill="#60a5fa" />
              <Bar dataKey="real" name="Real" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
