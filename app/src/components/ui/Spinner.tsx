import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-8 w-8 animate-spin text-primary-600', className)} />;
}

// Loader principal: el tren del tema recorre la ruta de estaciones de la app.
// Sin texto: solo la imagen en movimiento (la ruta se va dibujando al pasar el
// tren y la estación actual pulsa). El label se mantiene solo para accesibilidad.
const ROUTE_D = 'M34,186 C34,140 120,140 120,110 C120,80 186,80 186,40';

const LOADER_CSS = `
  .loader-route {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
    animation: loaderDraw 3.2s linear infinite;
  }
  .loader-train {
    offset-path: path('${ROUTE_D}');
    offset-rotate: auto;
    offset-distance: 100%;
    filter: drop-shadow(0 3px 8px rgb(14 124 102 / 0.35));
    animation: loaderTravel 3.2s linear infinite;
  }
  .loader-halo {
    transform-box: fill-box;
    transform-origin: center;
    animation: loaderHalo 2.4s ease-in-out infinite;
  }
  @keyframes loaderDraw {
    0% { stroke-dashoffset: 1; }
    62% { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes loaderTravel {
    0% { offset-distance: 0%; }
    62% { offset-distance: 100%; }
    100% { offset-distance: 100%; }
  }
  @keyframes loaderHalo {
    0%, 100% { transform: scale(0.7); opacity: 0.55; }
    50% { transform: scale(1.5); opacity: 0; }
  }
`;

export function LoadingScreen({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <svg viewBox="0 0 220 220" role="status" aria-label={label} aria-live="polite" className="h-40 w-40">
        <style>{LOADER_CSS}</style>

        <defs>
          <linearGradient id="loader-route" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#5fbda3" />
            <stop offset="100%" stopColor="#0e7c66" />
          </linearGradient>
          <linearGradient id="loader-train" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2ea584" />
            <stop offset="100%" stopColor="#0e7c66" />
          </linearGradient>
        </defs>

        {/* Vía base */}
        <path d={ROUTE_D} pathLength={1} fill="none" stroke="#d7e2dd" strokeWidth={3} strokeLinecap="round" />

        {/* Progreso: se dibuja a medida que avanza el tren */}
        <path
          d={ROUTE_D}
          pathLength={1}
          fill="none"
          stroke="url(#loader-route)"
          strokeWidth={3}
          strokeLinecap="round"
          className="loader-route"
        />

        {/* Estaciones de la ruta */}
        <circle cx={34} cy={186} r={5} fill="#8ba19a" />
        <circle cx={77} cy={107} r={4} fill="#b9c9c3" />
        <circle cx={107} cy={128} r={4} fill="#b9c9c3" />
        <circle cx={153} cy={99} r={4} fill="#b9c9c3" />

        {/* Estación actual (destino) pulsando */}
        <circle cx={186} cy={40} r={9} fill="none" stroke="#2ea584" strokeWidth={2} className="loader-halo" />
        <circle cx={186} cy={40} r={6} fill="#0e7c66" />

        {/* Tren recorriendo la ruta */}
        <g className="loader-train">
          <rect x={-16} y={-6.5} width={32} height={13} rx={6.5} fill="url(#loader-train)" />
          <rect x={-12} y={-3} width={24} height={2.4} rx={1.2} fill="#ffffff" opacity={0.45} />
        </g>
      </svg>
    </div>
  );
}