import type { Filters, WorkOrder } from '../lib/types';
import { uniqueAreas, uniqueDisciplinas, uniqueProgramas, uniqueSemanas } from '../lib/kpi';

interface Props {
  rows: WorkOrder[];
  value: Filters;
  onChange: (f: Filters) => void;
}

export function FiltersBar({ rows, value, onChange }: Props) {
  const semanas = uniqueSemanas(rows);
  const areas = uniqueAreas(rows);
  const programas = uniqueProgramas(rows);
  const disciplinas = uniqueDisciplinas(rows);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Select
        label="Semana"
        value={value.semana}
        options={['TODAS', ...semanas]}
        onChange={(v) => onChange({ ...value, semana: v as Filters['semana'] })}
      />
      <Select
        label="Área"
        value={value.area}
        options={['TODAS', ...areas]}
        onChange={(v) => onChange({ ...value, area: v as Filters['area'] })}
      />
      <Select
        label="Programa"
        value={value.programa}
        options={['TODOS', ...programas]}
        onChange={(v) => onChange({ ...value, programa: v as Filters['programa'] })}
      />
      <Select
        label="Disciplina"
        value={value.disciplina}
        options={['TODAS', ...disciplinas]}
        onChange={(v) => onChange({ ...value, disciplina: v as Filters['disciplina'] })}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col text-sm">
      <span className="text-slate-500 dark:text-slate-400 mb-1">{label}</span>
      <select
        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
