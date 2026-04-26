import type { DisciplinaSummaryRow } from '../lib/kpi';

interface Props {
  rows: DisciplinaSummaryRow[];
  activeDisciplina: string;
  onSelectDisciplina: (d: string) => void;
}

export function DisciplinaSummary({ rows, activeDisciplina, onSelectDisciplina }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="mb-2 text-sm font-semibold">Resumen por disciplina</div>
      {rows.length === 0 ? (
        <div className="text-sm text-slate-500">Sin datos.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400">
              <th className="py-1">Disciplina</th>
              <th className="py-1 text-right">Plan</th>
              <th className="py-1 text-right">Real</th>
              <th className="py-1 text-right">% Cumpl.</th>
              <th className="py-1 text-right">% Adher.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isActive = activeDisciplina === r.disciplina;
              return (
                <tr
                  key={r.disciplina}
                  onClick={() => onSelectDisciplina(isActive ? 'TODAS' : r.disciplina)}
                  className={[
                    'border-t border-slate-200 dark:border-slate-800 cursor-pointer',
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                  ].join(' ')}
                  title={isActive ? 'Click para quitar el filtro' : 'Click para filtrar el dashboard a esta disciplina'}
                >
                  <td className="py-1 font-medium">{r.disciplina}</td>
                  <td className="py-1 text-right">{r.plan}</td>
                  <td className="py-1 text-right">{r.real}</td>
                  <td className={`py-1 text-right ${pctClass(r.cumplimiento)}`}>
                    {(r.cumplimiento * 100).toFixed(1)}%
                  </td>
                  <td className={`py-1 text-right ${pctClass(r.adherencia)}`}>
                    {(r.adherencia * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function pctClass(v: number): string {
  if (v >= 0.9) return 'text-emerald-600 dark:text-emerald-400 font-medium';
  if (v >= 0.75) return 'text-amber-600 dark:text-amber-400 font-medium';
  return 'text-red-600 dark:text-red-400 font-medium';
}
