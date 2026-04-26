import type { WorkOrder } from '../lib/types';

interface Props {
  rows: WorkOrder[];
  value: string;
  onChange: (v: string) => void;
}

export function DisciplinaPills({ rows, value, onChange }: Props) {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.disciplina, (counts.get(r.disciplina) ?? 0) + 1);
  const disciplinas = Array.from(counts.keys()).sort();
  const total = rows.length;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
        Vista por especialidad
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill active={value === 'TODAS'} onClick={() => onChange('TODAS')} label="Todas" count={total} />
        {disciplinas.map((d) => (
          <Pill
            key={d}
            active={value === d}
            onClick={() => onChange(d)}
            label={d}
            count={counts.get(d) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition border',
        active
          ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800',
      ].join(' ')}
    >
      <span>{label}</span>
      <span
        className={[
          'inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full text-[11px] font-semibold',
          active ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  );
}
