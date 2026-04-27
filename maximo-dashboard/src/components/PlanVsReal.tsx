import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DayBucket } from '../lib/types';
import { CopyCsvButton } from './CopyCsvButton';
import { TODAY_LINE_COLOR, todayLabel } from '../lib/colors';

interface Props {
  data: DayBucket[];
  onSelectDia?: (diaIso: string) => void;
}

export function PlanVsReal({ data, onSelectDia }: Props) {
  const today = todayLabel();
  const hasToday = data.some((d) => d.label === today);

  const csvRows = data.map((d) => [d.dia, d.label, d.plan, d.real]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Plan vs Real por día</div>
        <CopyCsvButton headers={['fecha', 'dia', 'plan', 'real']} rows={csvRows} />
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {hasToday && (
              <ReferenceLine x={today} stroke={TODAY_LINE_COLOR} strokeDasharray="3 3" label={{ value: 'hoy', fill: TODAY_LINE_COLOR, fontSize: 11, position: 'top' }} />
            )}
            <Bar
              dataKey="plan"
              name="Plan"
              fill="#60a5fa"
              cursor={onSelectDia ? 'pointer' : undefined}
              onClick={(d: { dia?: string }) => d?.dia && onSelectDia?.(d.dia)}
            />
            <Bar
              dataKey="real"
              name="Real"
              fill="#16a34a"
              cursor={onSelectDia ? 'pointer' : undefined}
              onClick={(d: { dia?: string }) => d?.dia && onSelectDia?.(d.dia)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
