import { useCallback, useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  loading?: boolean;
  error?: string | null;
}

export function FileUpload({ onFile, loading, error }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handle = useCallback(
    (f: File | undefined | null) => {
      if (!f) return;
      if (!/\.xlsx?$/i.test(f.name)) {
        alert('Archivo inválido. Se espera .xlsx o .xls');
        return;
      }
      onFile(f);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handle(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={[
        'w-full rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition select-none',
        dragOver
          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30'
          : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      <div className="text-lg font-semibold">
        {loading ? 'Procesando…' : 'Arrastra el export Maximo aquí'}
      </div>
      <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Se espera la hoja <code className="font-mono">Lista de Órdenes de trabajo1</code> (o sin el 1).
        <br />
        El archivo se procesa 100% en tu navegador — no se sube a ningún servidor.
      </div>
      {error && (
        <div className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</div>
      )}
    </div>
  );
}
