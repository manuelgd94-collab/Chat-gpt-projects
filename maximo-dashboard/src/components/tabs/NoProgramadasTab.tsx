import { useMemo } from 'react';
import type { WorkOrder } from '../../lib/types';
import { CopyCsvButton } from '../CopyCsvButton';
import { fmtInt } from '../../lib/format';

interface Props {
  rows: WorkOrder[];
}

function fmtDateShort(d: Date | null): string {
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

export function NoProgramadasTab({ rows }: Props) {
  const finalizadas = useMemo(() => rows.filter((r) => r.inicioProgramado == null && r.completada), [rows]);
  const enCurso = useMemo(() => rows.filter((r) => r.inicioProgramado == null && !r.completada), [rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold mb-1">No Programadas</div>
        <div className="text-xs text-slate-500">
          OTs sin <code>Inicio programado</code> en el archivo. Las que aparecen son break-in / urgencias que se ejecutaron sin haber sido planificadas.
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <div className="text-xs uppercase text-emerald-700">No Programadas finalizadas</div>
            <div className="text-2xl font-semibold text-emerald-800">{fmtInt(finalizadas.length)}</div>
            <div className="text-[11px] text-emerald-700">Estado 70-COMP</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <div className="text-xs uppercase text-amber-700">No Programadas en curso</div>
            <div className="text-2xl font-semibold text-amber-800">{fmtInt(enCurso.length)}</div>
            <div className="text-[11px] text-amber-700">Estado distinto a 70-COMP</div>
          </div>
        </div>
      </div>

      <ListaOTs titulo="No Programadas finalizadas" rows={finalizadas} />
      <ListaOTs titulo="No Programadas en curso" rows={enCurso} />
    </div>
  );
}

function ListaOTs({ titulo, rows }: { titulo: string; rows: WorkOrder[] }) {
  const csvRows = rows.map((r) => [
    r.orden,
    r.descripcion,
    r.ubicacion,
    r.area,
    r.disciplina,
    r.grupoDueno,
    r.estado,
    r.finalizacionPrevista ?? '',
  ]);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">
          {titulo} <span className="text-slate-500 font-normal">({rows.length})</span>
        </div>
        <CopyCsvButton
          headers={['OT', 'Descripción', 'Ubicación', 'Área', 'Disciplina', 'Grupo', 'Estado', 'Finalización prevista']}
          rows={csvRows}
        />
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-slate-500 py-4 text-center">Sin OTs en este grupo.</div>
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1 pr-2">OT</th>
                <th className="py-1 pr-2">Descripción</th>
                <th className="py-1 pr-2">Disciplina</th>
                <th className="py-1 pr-2">Grupo</th>
                <th className="py-1 pr-2">Finalización prev.</th>
                <th className="py-1 pr-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.orden} className={`border-b border-slate-100 align-top ${i % 2 ? 'bg-slate-50/50' : ''}`}>
                  <td className="py-1 pr-2 font-mono">{r.orden}</td>
                  <td className="py-1 pr-2 max-w-[320px]" title={r.descripcion}>
                    <div className="truncate">{r.descripcion}</div>
                    <div className="text-[10px] text-slate-500">{r.ubicacion || '—'} · {r.area}</div>
                  </td>
                  <td className="py-1 pr-2">{r.disciplina}</td>
                  <td className="py-1 pr-2 font-mono text-[11px]">{r.grupoDueno || '—'}</td>
                  <td className="py-1 pr-2 whitespace-nowrap">{fmtDateShort(r.finalizacionPrevista)}</td>
                  <td className="py-1 pr-2 whitespace-nowrap font-mono text-[11px]">{r.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
