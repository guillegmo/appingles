import { Check } from 'lucide-react';
import { getIconSVG } from '../utils/memoryIcons';

interface MemoryCardProps {
  id: string;
  text: string;
  lang: 'en' | 'es';
  category: string;
  iconSVG?: string;
  matched: boolean;
  flipped: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function MemoryCard({
  id,
  text,
  lang,
  category,
  iconSVG,
  matched,
  flipped,
  onClick,
  disabled = false,
}: MemoryCardProps) {
  const isFlipped = flipped || matched;
  const svgContent = iconSVG || getIconSVG(category, text);

  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled || matched || flipped}
      className={`
        relative w-full aspect-square rounded-2xl border-2 shadow-sm transition-all duration-300
        select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 overflow-hidden
        ${matched
          ? 'border-emerald-400 bg-emerald-50 scale-[1.02] cursor-default shadow-inner'
          : flipped
          ? 'border-primary-400 bg-white shadow-md cursor-default'
          : 'border-slate-200 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 hover:shadow-md cursor-pointer text-white'}
      `}
      aria-label={isFlipped ? `Carta: ${text} (${lang === 'en' ? 'Inglés' : 'Español'})` : 'Carta boca abajo'}
      data-testid={`memory-card-${id}`}
    >
      {!isFlipped ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
          <span className="text-2xl sm:text-3xl font-black text-white/90">?</span>
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/70 font-semibold mt-0.5">AppIngles</span>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 animate-fade-in overflow-hidden">
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 mb-1 flex-shrink-0 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
            dangerouslySetInnerHTML={{ __html: svgContent }}
            aria-hidden="true"
          />
          <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
            {lang === 'en' ? 'Inglés' : 'Español'}
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-800 text-center px-1 leading-tight line-clamp-2 max-w-full break-words">
            {text}
          </span>
          {matched && (
            <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-2.5 w-2.5" />
            </div>
          )}
        </div>
      )}
    </button>
  );
}
