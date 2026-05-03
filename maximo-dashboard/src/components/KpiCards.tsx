import { fmtInt, fmtPct } from '../lib/format';
import { tone, toneText } from '../lib/thresholds';

export interface KpiCardsData {
  programadas: number;
  cerradas: number;
  pendientes: number;
  atrasadas: number;
  cumplimiento: number;
}

export function KpiCards({ data }: { data: KpiCardsData }) {
  const cumplTone = tone(data.cumplimiento);
  const cards = [
    {
      label: 'OTs programadas',
      value: fmtInt(data.programadas),
      hint: 'Total con Inicio programado en el período',
      cls: 'text-slate-900',
    },
    {
      label: 'OTs cerradas',
      value: fmtInt(data.cerradas),
      hint: 'Estado 70-COMP',
      cls: 'text-emerald-700',
    },
    {
      label: 'OTs pendientes',
      value: fmtInt(data.pendientes),
      hint: 'Programadas no cerradas',
      cls: data.pendientes === 0 ? 'text-emerald-700' : 'text-slate-900',
    },
    {
      label: 'OTs atrasadas',
      value: fmtInt(data.atrasadas),
      hint: 'Programado < hoy y estado ≠ 70-COMP',
      cls: data.atrasadas === 0 ? 'text-emerald-700' : data.atrasadas <= 5 ? 'text-amber-700' : 'text-red-700',
    },
    {
      label: '% Cumplimiento',
      value: fmtPct(data.cumplimiento),
      hint: 'Cerradas / Programadas',
      cls: toneText(cumplTone),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">{c.label}</div>
          <div className={`mt-1 text-2xl font-semibold ${c.cls}`}>{c.value}</div>
          {c.hint && <div className="mt-1 text-xs text-slate-500">{c.hint}</div>}
        </div>
      ))}
    </div>
  );
}
