export const THRESHOLD_GREEN = 0.85;
export const THRESHOLD_YELLOW = 0.7;

export type Tone = 'ok' | 'warn' | 'bad' | 'neutral';

export function tone(v: number): Tone {
  if (v >= THRESHOLD_GREEN) return 'ok';
  if (v >= THRESHOLD_YELLOW) return 'warn';
  return 'bad';
}

export function toneText(t: Tone): string {
  switch (t) {
    case 'ok':
      return 'text-emerald-600 font-medium';
    case 'warn':
      return 'text-amber-600 font-medium';
    case 'bad':
      return 'text-red-600 font-medium';
    default:
      return 'text-slate-900';
  }
}

export function toneBg(t: Tone): string {
  switch (t) {
    case 'ok':
      return 'bg-emerald-100 text-emerald-900';
    case 'warn':
      return 'bg-amber-100 text-amber-900';
    case 'bad':
      return 'bg-red-100 text-red-900';
    default:
      return 'bg-slate-100 text-slate-900';
  }
}

export function semaforoEmoji(t: Tone): string {
  switch (t) {
    case 'ok':
      return '🟢';
    case 'warn':
      return '🟡';
    case 'bad':
      return '🔴';
    default:
      return '⚪';
  }
}
