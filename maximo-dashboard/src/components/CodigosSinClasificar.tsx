import { useMemo } from 'react';
import type { WorkOrder } from '../lib/types';

interface Props {
  rows: WorkOrder[];
}

interface Bucket {
  grupo: string;
  count: number;
  ejemploDescripcion: string;
  ejemploArea: string;
  ejemploOrden: string;
}

export function CodigosSinClasificar({ rows }: Props) {
  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>();
    for (const r of rows) {
      if (r.disciplina !== 'Otros') continue;
      const key = r.grupoDueno || '(sin grupo)';
      const b = map.get(key);
      if (b) {
        b.count++;
      } else {
        map.set(key, {
          grupo: key,
          count: 1,
          ejemploDescripcion: r.descripcion,
          ejemploArea: r.area,
          ejemploOrden: r.orden,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [rows]);

  if (buckets.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Códigos sin clasificar (cayeron en "Otros")
          </div>
          <div className="text-xs text-amber-800 dark:text-amber-300">
            Estos <code>Grupo del dueño</code> no están en tu fórmula de disciplina. Pásame a qué especialidad va
            cada uno y los agrego al mapeo en <code>derive.ts</code>.
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 font-semibold">
          {buckets.length} código{buckets.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-amber-800 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800">
              <th className="py-1 pr-2">Grupo del dueño</th>
              <th className="py-1 pr-2 text-right">OTs</th>
              <th className="py-1 pr-2">Área (ejemplo)</th>
              <th className="py-1 pr-2">Ejemplo de descripción</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.grupo} className="border-b border-amber-100 dark:border-amber-900/50 align-top">
                <td className="py-1 pr-2 font-mono font-semibold">{b.grupo}</td>
                <td className="py-1 pr-2 text-right font-semibold">{b.count}</td>
                <td className="py-1 pr-2">{b.ejemploArea}</td>
                <td className="py-1 pr-2">
                  <div className="truncate max-w-[420px]" title={b.ejemploDescripcion}>
                    {b.ejemploDescripcion}
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">OT {b.ejemploOrden}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
