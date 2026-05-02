import { useState, type RefObject } from 'react';
import { toPng } from 'html-to-image';

interface Props {
  targetRef: RefObject<HTMLElement | null>;
  fileName: string;
  label?: string;
}

export function ExportPngButton({ targetRef, fileName, label = 'Exportar PNG' }: Props) {
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');

  async function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!targetRef.current) return;
    setState('busy');
    try {
      const dataUrl = await toPng(targetRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setState('ok');
      setTimeout(() => setState('idle'), 1500);
    } catch {
      setState('err');
      setTimeout(() => setState('idle'), 1500);
    }
  }

  const text =
    state === 'busy' ? 'Generando…' : state === 'ok' ? '✓ Descargado' : state === 'err' ? '✗ Error' : `📸 ${label}`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'busy'}
      className={[
        'text-xs px-2 py-1 rounded border transition disabled:opacity-50',
        state === 'ok'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
          : state === 'err'
          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200'
          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
      ].join(' ')}
      title="Descarga la sección como imagen PNG"
    >
      {text}
    </button>
  );
}
