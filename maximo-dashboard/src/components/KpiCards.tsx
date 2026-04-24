import type { KpiSummary } from '../lib/types';

interface Props {
  kpi: KpiSummary;
}

export function KpiCards({ kpi }: Props) {
  const cards = [
    {
      label: '% Cumplimiento',
      value: pct(kpi.cumplimiento),
      tone: tone(kpi.cumplimiento),
      hint: 'OT completadas / OT planificadas',
    },
    {
      label: '% Adherencia',
      value: pct(kpi.adherencia),
      tone: tone(kpi.adherencia),
      hint: 'OT completadas con previsto = programado',
    },
    { label: 'OT Plan', value: String(kpi.planCount), tone: 'neutral' as const },
    { label: 'OT Real', value: String(kpi.realCount), tone: 'neutral' as const },
    {
      label: 'Desviación',
      value: `${kpi.desviacion >= 0 ? '+' : ''}${kpi.desviacion}`,
      tone: kpi.desviacion >= 0 ? ('ok' as const) : ('bad' as const),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
        >
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {c.label}
          </div>
          <div className={`mt-1 text-2xl font-semibold ${toneClass(c.tone)}`}>{c.value}</div>
          {c.hint && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.hint}</div>}
        </div>
      ))}
    </div>
  );
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function tone(v: number): 'ok' | 'warn' | 'bad' {
  if (v >= 0.9) return 'ok';
  if (v >= 0.75) return 'warn';
  return 'bad';
}

function toneClass(t: 'ok' | 'warn' | 'bad' | 'neutral'): string {
  switch (t) {
    case 'ok':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'warn':
      return 'text-amber-600 dark:text-amber-400';
    case 'bad':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-slate-900 dark:text-slate-100';
  }
}
