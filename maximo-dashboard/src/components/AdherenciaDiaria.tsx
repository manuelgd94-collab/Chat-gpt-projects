import { useMemo, useRef } from 'react';
import type { WorkOrder } from '../lib/types';
import { ESTADOS_PIVOT, adherenciaDiariaPivot, uniqueProgramadosDates } from '../lib/kpi';
import { CopyCsvButton } from './CopyCsvButton';
import { ExportPngButton } from './ExportPngButton';
import { fmtPct } from '../lib/format';

interface Props {
  rows: WorkOrder[];
  fecha: string;
  onChangeFecha: (f: string) => void;
}

export function AdherenciaDiaria({ rows, fecha, onChangeFecha }: Props) {
  const pivot = useMemo(() => adherenciaDiariaPivot(rows, fecha), [rows, fecha]);
  const fechasDisponibles = useMemo(() => uniqueProgramadosDates(rows), [rows]);
  const headerLabel = useMemo(() => formatFechaLarga(fecha), [fecha]);
  const tableRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
        <div>
          <div className="text-sm font-semibold">Adherencia Diaria al Programa</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            OTs cuyo Inicio programado cae en el día seleccionado, agrupadas por disciplina y estado.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">Día objetivo</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => onChangeFecha(e.target.value)}
            list="fechas-programadas"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm"
          />
          <datalist id="fechas-programadas">
            {fechasDisponibles.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <CopyCsvButton
            headers={['Especialidad', ...ESTADOS_PIVOT, 'Total general', '% Adherencia al Programa']}
            rows={[
              ...pivot.rows.map((r) => [r.disciplina, ...ESTADOS_PIVOT.map((e) => r.counts[e]), r.total, fmtPct(r.adherencia, 0)]),
              [pivot.totalRow.disciplina, ...ESTADOS_PIVOT.map((e) => pivot.totalRow.counts[e]), pivot.totalRow.total, fmtPct(pivot.totalRow.adherencia, 0)],
            ]}
          />
          <ExportPngButton targetRef={tableRef} fileName={`adherencia-diaria-${fecha}.png`} />
        </div>
      </div>

      <div className="overflow-x-auto bg-white p-2" ref={tableRef}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th
                colSpan={ESTADOS_PIVOT.length + 3}
                className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-semibold py-2 border border-slate-300 dark:border-slate-700"
              >
                {headerLabel}
              </th>
            </tr>
            <tr className="bg-sky-200 dark:bg-sky-900/50 text-slate-900 dark:text-slate-100">
              <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-left">Especialidad</th>
              {ESTADOS_PIVOT.map((e) => (
                <th key={e} className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center">
                  {e}
                </th>
              ))}
              <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center">Total general</th>
              <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center">
                Adherencia al Programa
              </th>
            </tr>
          </thead>
          <tbody>
            {pivot.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={ESTADOS_PIVOT.length + 3}
                  className="border border-slate-300 dark:border-slate-700 text-center py-6 text-slate-500"
                >
                  Sin OTs programadas para {fecha}.
                </td>
              </tr>
            ) : (
              pivot.rows.map((r) => (
                <tr key={r.disciplina} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1 font-medium">
                    {r.disciplina}
                  </td>
                  {ESTADOS_PIVOT.map((e) => (
                    <td
                      key={e}
                      className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center"
                    >
                      {r.counts[e] || ''}
                    </td>
                  ))}
                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-semibold">
                    {r.total}
                  </td>
                  <td
                    className={`border border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-semibold ${adherenciaClass(
                      r.adherencia,
                    )}`}
                  >
                    {(r.adherencia * 100).toFixed(0)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {pivot.rows.length > 0 && (
            <tfoot>
              <tr className="bg-sky-200 dark:bg-sky-900/50 font-semibold">
                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1">
                  {pivot.totalRow.disciplina}
                </td>
                {ESTADOS_PIVOT.map((e) => (
                  <td
                    key={e}
                    className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center"
                  >
                    {pivot.totalRow.counts[e] || ''}
                  </td>
                ))}
                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-center">
                  {pivot.totalRow.total}
                </td>
                <td
                  className={`border border-slate-300 dark:border-slate-700 px-2 py-1 text-center ${adherenciaClass(
                    pivot.totalRow.adherencia,
                  )}`}
                >
                  {(pivot.totalRow.adherencia * 100).toFixed(0)}%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Fórmula: <code>Adherencia = OTs en estado 70-COMP / Total general del día</code>. Replica el pivote manual
        actual mientras no haya fecha real de ejecución desde Maximo.
      </div>
    </div>
  );
}

function adherenciaClass(v: number): string {
  if (v >= 0.9) return 'bg-emerald-200/70 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200';
  if (v >= 0.75) return 'bg-amber-200/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200';
  return 'bg-red-200/70 dark:bg-red-900/40 text-red-900 dark:text-red-200';
}

function formatFechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  try {
    return new Intl.DateTimeFormat('es', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return iso;
  }
}
