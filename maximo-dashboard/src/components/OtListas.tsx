import type { WorkOrder } from '../lib/types';
import { CopyCsvButton } from './CopyCsvButton';

interface Props {
  rows: WorkOrder[];
  show?: 'atrasadas' | 'incumplimiento' | 'both';
}

const ATRASADAS_RE = /^(55|60)/;
const INCUMPLIMIENTO_RE = /^(32|40|50|90)/;

export function OtListas({ rows, show = 'both' }: Props) {
  const atrasadas = rows.filter((r) => ATRASADAS_RE.test(r.estado.trim()));
  const incumplimiento = rows.filter((r) => INCUMPLIMIENTO_RE.test(r.estado.trim()));

  if (show === 'atrasadas') {
    return (
      <OtTabla
        titulo="OTs atrasadas por cierre"
        descripcion="Estados 55-SCH y 60-INPRG — programadas pero aún no completadas."
        rows={atrasadas}
        accent="amber"
      />
    );
  }

  if (show === 'incumplimiento') {
    return (
      <OtTabla
        titulo="OTs en incumplimiento"
        descripcion="Estados 32 (WPCOND), 40, 50 y 90 — en espera o canceladas."
        rows={incumplimiento}
        accent="red"
      />
    );
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <OtTabla
        titulo="OTs atrasadas por cierre"
        descripcion="Estados 55-SCH y 60-INPRG — programadas pero aún no completadas."
        rows={atrasadas}
        accent="amber"
      />
      <OtTabla
        titulo="OTs en incumplimiento"
        descripcion="Estados 32 (WPCOND), 40, 50 y 90 — en espera o canceladas."
        rows={incumplimiento}
        accent="red"
      />
    </section>
  );
}

function OtTabla({
  titulo,
  descripcion,
  rows,
  accent,
}: {
  titulo: string;
  descripcion: string;
  rows: WorkOrder[];
  accent: 'amber' | 'red';
}) {
  const sorted = [...rows].sort((a, b) => {
    const aT = a.inicioProgramado?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bT = b.inicioProgramado?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aT - bT;
  });

  const accentClass =
    accent === 'amber'
      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200'
      : 'bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-200';

  const csvRows = sorted.map((r) => [
    r.orden,
    r.descripcion,
    r.ubicacion,
    r.area,
    r.disciplina,
    r.grupoDueno,
    r.inicioProgramado ? r.inicioProgramado : '',
    r.estado,
  ]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold">{titulo}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{descripcion}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${accentClass}`}>{rows.length}</span>
          <CopyCsvButton
            headers={['OT', 'Descripción', 'Ubicación', 'Área', 'Disciplina', 'Grupo', 'Programado', 'Estado']}
            rows={csvRows}
          />
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="text-sm text-slate-500 py-4 text-center">Sin OTs en estos estados.</div>
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white dark:bg-slate-900">
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-1 pr-2">OT</th>
                <th className="py-1 pr-2">Descripción</th>
                <th className="py-1 pr-2">Disciplina</th>
                <th className="py-1 pr-2">Grupo</th>
                <th className="py-1 pr-2">Programado</th>
                <th className="py-1 pr-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={r.orden}
                  className={[
                    'border-b border-slate-100 dark:border-slate-800/50 align-top',
                    i % 2 ? 'bg-slate-50/50 dark:bg-slate-800/20' : '',
                  ].join(' ')}
                >
                  <td className="py-1 pr-2 font-mono">{r.orden}</td>
                  <td className="py-1 pr-2 max-w-[280px]" title={r.descripcion}>
                    <div className="truncate">{r.descripcion}</div>
                    <div className="text-[10px] text-slate-500">
                      {r.ubicacion || '—'} · {r.area}
                    </div>
                  </td>
                  <td className="py-1 pr-2">{r.disciplina}</td>
                  <td className="py-1 pr-2 font-mono text-[11px]">{r.grupoDueno || '—'}</td>
                  <td className="py-1 pr-2 whitespace-nowrap">{fmtDateShort(r.inicioProgramado)}</td>
                  <td className="py-1 pr-2 whitespace-nowrap">
                    <EstadoBadge estado={r.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const e = estado.trim();
  let cls = 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
  if (/^32/.test(e)) cls = 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-200';
  else if (/^40/.test(e)) cls = 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-200';
  else if (/^50/.test(e)) cls = 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-200';
  else if (/^55/.test(e)) cls = 'bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200';
  else if (/^60/.test(e)) cls = 'bg-sky-200 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200';
  else if (/^70/.test(e)) cls = 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200';
  else if (/^90/.test(e)) cls = 'bg-purple-200 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200';
  return <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[11px] ${cls}`}>{e || '—'}</span>;
}

function fmtDateShort(d: Date | null): string {
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}
