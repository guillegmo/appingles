import { cn } from '../utils/cn';

export type RouteDay = { day: number; completed: boolean; locked: boolean };

const WEEK_DAYS = 7;

export function DayRoute({
  days,
  currentDay,
  onSelect,
}: {
  days: RouteDay[];
  currentDay?: number;
  onSelect?: (day: number) => void;
}) {
  const weeks = Array.from({ length: Math.ceil(days.length / WEEK_DAYS) }, (_, w) =>
    days.slice(w * WEEK_DAYS, w * WEEK_DAYS + WEEK_DAYS),
  );

  return (
    <div className="space-y-4">
      {weeks.map((week, wi) => {
        const completedInWeek = week.filter((d) => d.completed).length;
        const fill = (completedInWeek / week.length) * 100;
        return (
          <div key={wi}>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="station-label text-slate-500">Semana {wi + 1}</p>
              <p className="num text-[10px] font-semibold text-slate-400">
                {completedInWeek}/{week.length}
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-x-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200/80" />
              <div className="absolute inset-x-3 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all duration-500"
                  style={{ width: `${fill}%` }}
                />
              </div>
              <div className="relative grid grid-cols-7 gap-1">
                {week.map((d) => {
                  const isCurrent = d.day === currentDay;
                  const active = onSelect && !d.locked;
                  return (
                    <button
                      key={d.day}
                      type="button"
                      disabled={!active}
                      onClick={() => active && onSelect(d.day)}
                      aria-label={isCurrent ? `Día ${d.day}, estación actual` : `Día ${d.day}`}
                      title={d.completed ? `Repasar día ${d.day}` : undefined}
                      className={cn(
                        'relative z-10 flex aspect-square w-full items-center justify-center rounded-full text-xs font-bold transition-transform',
                        d.completed && 'bg-emerald-500 text-white hover:brightness-110',
                        isCurrent && 'bg-primary-600 text-white animate-station',
                        !d.completed && !isCurrent && d.locked && 'bg-slate-100 text-slate-400',
                        !d.completed && !isCurrent && !d.locked && 'bg-white text-slate-600 ring-1 ring-slate-300',
                        active && 'cursor-pointer hover:ring-2 hover:ring-primary-300',
                      )}
                    >
                      <span className="num">{d.day}</span>
                      {isCurrent && (
                        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-wide text-primary-600">
                          hoy
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}