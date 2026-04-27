export const DISC_COLORS: Record<string, string> = {
  'Mecánicos': '#3b82f6',
  'Eléctricos': '#f59e0b',
  'Instrumentista': '#8b5cf6',
  'DCS': '#06b6d4',
  'Lubricador': '#84cc16',
  'Moncon': '#ec4899',
  'Otros': '#94a3b8',
};

const PALETTE = [
  '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16',
  '#ec4899', '#ef4444', '#10b981', '#f97316', '#a855f7',
];

export function colorFor(disciplina: string): string {
  if (DISC_COLORS[disciplina]) return DISC_COLORS[disciplina];
  let hash = 0;
  for (let i = 0; i < disciplina.length; i++) hash = (hash * 31 + disciplina.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export const TODAY_LINE_COLOR = '#dc2626';

export function todayLabel(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}
