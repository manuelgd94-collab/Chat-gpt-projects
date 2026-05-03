import { useState, type ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  badge?: number | string;
  badgeTone?: 'default' | 'red' | 'amber';
  content: ReactNode;
}

interface Props {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (id: string) => void;
}

export function Tabs({ tabs, defaultTab, onChange }: Props) {
  const [activeId, setActiveId] = useState<string>(defaultTab ?? tabs[0]?.id ?? '');
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 sticky top-0 bg-slate-50/95 backdrop-blur z-20">
        <nav className="flex flex-wrap gap-1 max-w-7xl mx-auto px-1 -mb-px">
          {tabs.map((t) => {
            const isActive = t.id === active?.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveId(t.id);
                  onChange?.(t.id);
                }}
                className={[
                  'px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2',
                  isActive
                    ? 'border-sky-600 text-sky-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300',
                ].join(' ')}
              >
                <span>{t.label}</span>
                {t.badge !== undefined && t.badge !== 0 && t.badge !== '0' && (
                  <span
                    className={[
                      'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-semibold',
                      t.badgeTone === 'red'
                        ? 'bg-red-100 text-red-700'
                        : t.badgeTone === 'amber'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-700',
                    ].join(' ')}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div>{active?.content}</div>
    </div>
  );
}
