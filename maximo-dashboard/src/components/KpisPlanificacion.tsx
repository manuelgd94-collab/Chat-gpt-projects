import type { PmComplianceResult } from '../lib/kpi';

interface Props {
  pm: PmComplianceResult;
  backlogCount: number;
  npPlan: number;
  npReal: number;
}

export function KpisPlanificacion({ pm, backlogCount, npPlan, npReal }: Props) {
  const npRatio = npPlan > 0 ? npReal / npPlan : 0;
  const cards = [
    {
      label: '% PM Compliance',
      value: pct(pm.pmRatio),
      tone: tone(pm.pmRatio),
      hint: `${pm.pmReal} / ${pm.pmPlan} preventivas completadas`,
    },
    {
      label: 'Backlog (atrasadas)',
      value: String(backlogCount),
      tone: backlogCount === 0 ? ('ok' as const) : backlogCount <= 5 ? ('warn' as const) : ('bad' as const),
      hint: 'OTs programadas ≤ hoy aún no en 70-COMP',
    },
    {
      label: 'NP semana (no programadas)',
      value: `${npReal}/${npPlan}`,
      tone: tone(npRatio),
      hint: `OTs aparecidas en updates · ${pct(npRatio)} ejecutadas`,
    },
    {
      label: 'Mix PM / CM',
      value: `${Math.round(pm.ratioPmCm * 100)}% / ${Math.round((1 - pm.ratioPmCm) * 100)}%`,
      tone: 'neutral' as const,
      hint: `${pm.pmPlan} preventivas · ${pm.cmPlan} correctivas`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
        >
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{c.label}</div>
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
