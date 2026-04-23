import type { Area } from './types';

const SEMANA_RE = /S\s*(\d{1,2})(?:[_\-\s](\d{2}))?/i;

export function deriveSemana(descripcion: string): string | null {
  if (!descripcion) return null;
  const m = descripcion.match(SEMANA_RE);
  if (!m) return null;
  const n = m[1].padStart(2, '0');
  return m[2] ? `S${n}_${m[2]}` : `S${n}`;
}

const AREA_RE = /\b(PRT|PIP|PIPELINE|DESAL|DSL|PLNT|PLANT|PLANTA)\b/i;

export function deriveArea(descripcion: string, ubicacion: string): Area {
  const src = `${descripcion ?? ''} ${ubicacion ?? ''}`;
  const m = src.match(AREA_RE);
  if (!m) return 'OTRO';
  const tok = m[1].toUpperCase();
  if (tok === 'PIP' || tok === 'PIPELINE' || tok === 'PRT') return 'PIPELINE';
  if (tok === 'DESAL' || tok === 'DSL') return 'DESAL';
  if (tok === 'PLNT' || tok === 'PLANT' || tok === 'PLANTA') return 'PLANTA';
  return 'OTRO';
}

const DISC_CODE_MAP: Record<string, string> = {
  MEC: 'Mecánicos',
  ELE: 'Eléctricos',
  INS: 'Instrumentista',
  DCS: 'DCS',
  MON: 'Moncon',
  LUB: 'Lubricador',
};

export function deriveDisciplina(grupoDueno: string): string {
  const s = (grupoDueno ?? '').trim();
  if (!s) return 'Sin disciplina';

  for (const [code, label] of Object.entries(DISC_CODE_MAP)) {
    if (new RegExp(`\\b${code}\\b`, 'i').test(s)) return label;
  }

  const lower = s.toLowerCase();
  if (lower.includes('mec')) return 'Mecánicos';
  if (lower.includes('elec') || lower.includes('eléc')) return 'Eléctricos';
  if (lower.includes('inst')) return 'Instrumentista';
  if (lower.includes('dcs')) return 'DCS';
  if (lower.includes('moncon') || lower.includes('mon-con')) return 'Moncon';
  if (lower.includes('lubric')) return 'Lubricador';

  return s;
}

export function isCompletada(estado: string): boolean {
  return /^70/.test((estado ?? '').trim());
}

export function derivePrograma(wo: { descripcion: string; ubicacion: string }): string {
  const src = `${wo.descripcion ?? ''} ${wo.ubicacion ?? ''}`.toUpperCase();
  if (src.includes('PIPELINE') || src.includes('PIP') || src.includes('PRT')) return 'Puerto Pipeline';
  if (src.includes('DESAL')) return 'Desaladora';
  if (src.includes('PLANTA') || src.includes('PLANT') || src.includes('PLNT')) return 'Planta';
  return 'Otro';
}

export function dayKey(d: Date | null): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
