import type { AreaSummaryRow } from '../lib/kpi';
import { CopyCsvButton } from './CopyCsvButton';
import { fmtInt, fmtPct } from '../lib/format';

export function AreaSummary({ rows }: { rows: AreaSummaryRow[] }) {
  const totalPlan = rows.reduce((s, r) => s + r.plan, 0);
  const totalReal = rows.reduce((s, r) => s + r.real, 0);
  const totalCumpl = totalPlan > 0 ? totalReal / totalPlan : 0;
  const csvRows = rows.map((r) => [r.area, r.plan, r.real, fmtPct(r.cumplimiento), fmtPct(r.adherencia)]);
  csvRows.push(['Total', totalPlan, totalReal, fmtPct(totalCumpl), '']);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Resumen por área</div>
        <CopyCsvButton headers={['Área', 'Plan', 'Real', '%Cumpl', '%Adher']} rows={csvRows} />
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-slate-500">Sin datos.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white dark:bg-slate-900">
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-1">Área</th>
                <th className="py-1 text-right">Plan</th>
                <th className="py-1 text-right">Real</th>
                <th className="py-1 text-right">% Cumpl.</th>
                <th className="py-1 text-right">% Adher.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.area}
                  className={[
                    'border-b border-slate-100 dark:border-slate-800/50',
                    i % 2 ? 'bg-slate-50/50 dark:bg-slate-800/20' : '',
                  ].join(' ')}
                >
                  <td className="py-1 font-medium">{r.area}</td>
                  <td className="py-1 text-right tabular-nums">{fmtInt(r.plan)}</td>
                  <td className="py-1 text-right tabular-nums">{fmtInt(r.real)}</td>
                  <td className={`py-1 text-right tabular-nums ${pctClass(r.cumplimiento)}`}>{fmtPct(r.cumplimiento)}</td>
                  <td className={`py-1 text-right tabular-nums ${pctClass(r.adherencia)}`}>{fmtPct(r.adherencia)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 dark:border-slate-600 font-semibold bg-slate-100 dark:bg-slate-800/40">
                <td className="py-1">Total</td>
                <td className="py-1 text-right tabular-nums">{fmtInt(totalPlan)}</td>
                <td className="py-1 text-right tabular-nums">{fmtInt(totalReal)}</td>
                <td className={`py-1 text-right tabular-nums ${pctClass(totalCumpl)}`}>{fmtPct(totalCumpl)}</td>
                <td className="py-1 text-right tabular-nums text-slate-400">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function pctClass(v: number): string {
  if (v >= 0.9) return 'text-emerald-600 dark:text-emerald-400 font-medium';
  if (v >= 0.75) return 'text-amber-600 dark:text-amber-400 font-medium';
  return 'text-red-600 dark:text-red-400 font-medium';
}
