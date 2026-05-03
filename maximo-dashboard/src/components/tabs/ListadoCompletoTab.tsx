import { useMemo, useState } from 'react';
import type { WorkOrder } from '../../lib/types';
import { CopyCsvButton } from '../CopyCsvButton';

const PAGE_SIZE = 100;

interface Props {
  rows: WorkOrder[];
}

function fmtDateShort(d: Date | null): string {
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

export function ListadoCompletoTab({ rows }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.orden.toLowerCase().includes(q) ||
        r.descripcion.toLowerCase().includes(q) ||
        r.ubicacion.toLowerCase().includes(q) ||
        r.grupoDueno.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const csvRows = filtered.map((r) => [
    r.orden,
    r.descripcion,
    r.ubicacion,
    r.area,
    r.disciplina,
    r.grupoDueno,
    r.tipoOT,
    r.prioridad ?? '',
    r.inicioProgramado ?? '',
    r.inicioPrevisto ?? '',
    r.finalizacionPrevista ?? '',
    r.estado,
    r.duracion ?? '',
  ]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
        <div>
          <div className="text-sm font-semibold">
            Listado completo de OTs <span className="text-slate-500 font-normal">({filtered.length} / {rows.length})</span>
          </div>
          <div className="text-xs text-slate-500">Filtra y exporta como CSV. Respeta los filtros del dashboard.</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar OT, descripción, ubicación, grupo…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm w-64"
          />
          <CopyCsvButton
            headers={[
              'OT', 'Descripción', 'Ubicación', 'Área', 'Disciplina', 'Grupo', 'Tipo OT',
              'Prioridad', 'Inicio programado', 'Inicio previsto', 'Finalización prevista', 'Estado', 'Duración',
            ]}
            rows={csvRows}
          />
        </div>
      </div>

      {slice.length === 0 ? (
        <div className="text-sm text-slate-500 py-6 text-center">Sin resultados.</div>
      ) : (
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1 pr-2">OT</th>
                <th className="py-1 pr-2">Descripción</th>
                <th className="py-1 pr-2">Disciplina</th>
                <th className="py-1 pr-2">Área</th>
                <th className="py-1 pr-2">Grupo</th>
                <th className="py-1 pr-2">Tipo</th>
                <th className="py-1 pr-2">Prio</th>
                <th className="py-1 pr-2">Programado</th>
                <th className="py-1 pr-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((r, i) => (
                <tr key={r.orden} className={`border-b border-slate-100 align-top ${i % 2 ? 'bg-slate-50/50' : ''}`}>
                  <td className="py-1 pr-2 font-mono">{r.orden}</td>
                  <td className="py-1 pr-2 max-w-[280px]" title={r.descripcion}>
                    <div className="truncate">{r.descripcion}</div>
                    <div className="text-[10px] text-slate-500">{r.ubicacion || '—'}</div>
                  </td>
                  <td className="py-1 pr-2">{r.disciplina}</td>
                  <td className="py-1 pr-2">{r.area}</td>
                  <td className="py-1 pr-2 font-mono text-[11px]">{r.grupoDueno || '—'}</td>
                  <td className="py-1 pr-2">{r.tipoOT || '—'}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{r.prioridad ?? '—'}</td>
                  <td className="py-1 pr-2 whitespace-nowrap">{fmtDateShort(r.inicioProgramado)}</td>
                  <td className="py-1 pr-2 whitespace-nowrap font-mono text-[11px]">{r.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <button
            disabled={safePage === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40 hover:bg-slate-100"
          >
            ← Anterior
          </button>
          <span>
            Página {safePage + 1} de {totalPages}
          </span>
          <button
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40 hover:bg-slate-100"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
