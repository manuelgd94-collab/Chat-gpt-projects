import type { MatrixCell } from '../lib/types';

interface Props {
  disciplinas: string[];
  dias: { dia: string; label: string }[];
  cells: Map<string, MatrixCell>;
}

export function Matrix({ disciplinas, dias, cells }: Props) {
  if (disciplinas.length === 0 || dias.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="mb-2 text-sm font-semibold">Matriz Disciplina × Día</div>
        <div className="text-sm text-slate-500">Sin datos para los filtros actuales.</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 overflow-auto">
      <div className="mb-2 text-sm font-semibold">Matriz Disciplina × Día</div>
      <table className="w-full text-xs border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th className="text-left sticky left-0 bg-white dark:bg-slate-900 z-10 px-2 py-1">Disciplina</th>
            {dias.map((d) => (
              <th key={d.dia} className="px-2 py-1 text-center">
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {disciplinas.map((d) => (
            <tr key={d}>
              <td className="font-medium sticky left-0 bg-white dark:bg-slate-900 px-2 py-1">{d}</td>
              {dias.map((col) => {
                const cell = cells.get(`${d}__${col.dia}`);
                if (!cell || (cell.plan === 0 && cell.real === 0)) {
                  return <td key={col.dia} className="px-2 py-1 text-center text-slate-400">—</td>;
                }
                return (
                  <td
                    key={col.dia}
                    className={`px-2 py-1 text-center text-white rounded ${cellColor(cell.pct)}`}
                    title={`Plan ${cell.plan} · Real ${cell.real} · ${(cell.pct * 100).toFixed(0)}%`}
                  >
                    {cell.real}/{cell.plan}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex gap-3 text-xs">
        <Legend color="bg-emerald-600" label="≥ 90%" />
        <Legend color="bg-amber-500" label="75% – 89%" />
        <Legend color="bg-red-600" label="< 75%" />
      </div>
    </div>
  );
}

function cellColor(pct: number): string {
  if (pct >= 0.9) return 'bg-emerald-600';
  if (pct >= 0.75) return 'bg-amber-500';
  return 'bg-red-600';
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`inline-block w-3 h-3 rounded ${color}`} />
      <span>{label}</span>
    </div>
  );
}
