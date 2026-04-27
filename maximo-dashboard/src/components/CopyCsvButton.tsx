import { useState } from 'react';
import { copyCsv } from '../lib/csv';

interface Props {
  headers: string[];
  rows: unknown[][];
  label?: string;
}

export function CopyCsvButton({ headers, rows, label = 'Copiar CSV' }: Props) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle');

  async function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await copyCsv(headers, rows);
      setState('ok');
      setTimeout(() => setState('idle'), 1500);
    } catch {
      setState('err');
      setTimeout(() => setState('idle'), 1500);
    }
  }

  const text = state === 'ok' ? '✓ Copiado' : state === 'err' ? '✗ Error' : `📋 ${label}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'text-xs px-2 py-1 rounded border transition',
        state === 'ok'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
          : state === 'err'
          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200'
          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
      ].join(' ')}
      title="Copia los datos como CSV (separado por ;) al portapapeles"
    >
      {text}
    </button>
  );
}
