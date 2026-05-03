import { useMemo } from 'react';
import type { WorkOrder } from '../lib/types';
import { dayKey, dayLabel } from '../lib/derive';
import { CopyCsvButton } from './CopyCsvButton';
import { fmtInt, fmtPct } from '../lib/format';
import { semaforoEmoji, tone, toneBg, toneText } from '../lib/thresholds';

interface Props {
  rows: WorkOrder[];
}

interface DayRow {
  dia: string;
  label: string;
  programadas: number;
  cerradas: number;
  pendientes: number;
  cumplimiento: number;
}

function buildDayRows(rows: WorkOrder[]): DayRow[] {
  const map = new Map<string, { programadas: number; cerradas: number }>();
  for (const r of rows) {
    const k = dayKey(r.inicioProgramado);
    if (!k) continue;
    const b = map.get(k) ?? { programadas: 0, cerradas: 0 };
    b.programadas += 1;
    if (r.completada) b.cerradas += 1;
    map.set(k, b);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, v]) => ({
      dia,
      label: dayLabel(dia),
      programadas: v.programadas,
      cerradas: v.cerradas,
      pendientes: v.programadas - v.cerradas,
      cumplimiento: v.programadas > 0 ? v.cerradas / v.programadas : 0,
    }));
}

export function TablaDiaria({ rows }: Props) {
  const days = useMemo(() => buildDayRows(rows), [rows]);
  const totalProg = days.reduce((s, d) => s + d.programadas, 0);
  const totalCerr = days.reduce((s, d) => s + d.cerradas, 0);
  const totalPend = totalProg - totalCerr;
  const totalCumpl = totalProg > 0 ? totalCerr / totalProg : 0;
  const totalTone = tone(totalCumpl);

  const csvRows = days.map((d) => [
    d.dia,
    d.label,
    d.programadas,
    d.cerradas,
    d.pendientes,
    fmtPct(d.cumplimiento),
    semaforoEmoji(tone(d.cumplimiento)),
  ]);
  csvRows.push(['', 'Total', totalProg, totalCerr, totalPend, fmtPct(totalCumpl), semaforoEmoji(totalTone)]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold">Cumplimiento por día</div>
          <div className="text-xs text-slate-500">
            OTs programadas, cerradas (70-COMP), pendientes y % de cumplimiento por día.
          </div>
        </div>
        <CopyCsvButton
          headers={['fecha', 'día', 'programadas', 'cerradas', 'pendientes', '%cumpl', 'semáforo']}
          rows={csvRows}
        />
      </div>

      {days.length === 0 ? (
        <div className="text-sm text-slate-500 py-6 text-center">
          Sin OTs programadas en el período filtrado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1.5">Día</th>
                <th className="py-1.5 text-right">Programadas</th>
                <th className="py-1.5 text-right">Cerradas</th>
                <th className="py-1.5 text-right">Pendientes</th>
                <th className="py-1.5 text-right">% Cumpl.</th>
                <th className="py-1.5 text-center">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => {
                const t = tone(d.cumplimiento);
                return (
                  <tr
                    key={d.dia}
                    className={[
                      'border-b border-slate-100',
                      i % 2 ? 'bg-slate-50/50' : '',
                    ].join(' ')}
                  >
                    <td className="py-1.5 font-medium">{d.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmtInt(d.programadas)}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmtInt(d.cerradas)}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmtInt(d.pendientes)}</td>
                    <td className={`py-1.5 text-right tabular-nums ${toneText(t)}`}>
                      {fmtPct(d.cumplimiento)}
                    </td>
                    <td className="py-1.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${toneBg(t)}`}>
                        {semaforoEmoji(t)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-semibold bg-slate-100">
                <td className="py-1.5">Total</td>
                <td className="py-1.5 text-right tabular-nums">{fmtInt(totalProg)}</td>
                <td className="py-1.5 text-right tabular-nums">{fmtInt(totalCerr)}</td>
                <td className="py-1.5 text-right tabular-nums">{fmtInt(totalPend)}</td>
                <td className={`py-1.5 text-right tabular-nums ${toneText(totalTone)}`}>{fmtPct(totalCumpl)}</td>
                <td className="py-1.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${toneBg(totalTone)}`}>
                    {semaforoEmoji(totalTone)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div className="mt-2 text-[11px] text-slate-500">
        Umbrales: 🟢 ≥ 85% · 🟡 70-84% · 🔴 &lt; 70%.
      </div>
    </div>
  );
}
