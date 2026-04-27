import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { NPBucket } from '../lib/kpi';

interface Props {
  data: NPBucket[];
}

export function NPSeguimiento({ data }: Props) {
  const totalPlan = data.reduce((s, b) => s + b.plan, 0);
  const totalReal = data.reduce((s, b) => s + b.real, 0);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold">Seguimiento diario NP (Prioridad 1–3)</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            OTs no planeadas/urgentes con Inicio programado dentro de la semana en curso.
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="text-slate-500 dark:text-slate-400">Semana</div>
          <div className="font-semibold">
            {totalReal}/{totalPlan}{' '}
            <span className="text-slate-500">
              ({totalPlan > 0 ? Math.round((totalReal / totalPlan) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-slate-500 py-8 text-center">
          Sin OTs de prioridad 1–3 con fecha programada en la semana actual.
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="plan" name="Programadas NP" fill="#f97316" />
              <Bar dataKey="real" name="Ejecutadas NP" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
