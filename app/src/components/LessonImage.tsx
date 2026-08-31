import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../utils/cn';
import type { ImageAsset } from '../types';

// Imagen pedagógica reutilizable: skeleton mientras carga, fallback silencioso
// si falla o no existe (nunca rompe la lección), lazy loading y alt accesible.
export function LessonImage({
  asset,
  alt,
  className,
}: {
  asset?: ImageAsset | null;
  alt: string;
  className?: string;
}) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(asset ? 'loading' : 'error');

  if (!asset || status === 'error') {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl bg-slate-100 text-slate-300',
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-slate-100', className)}>
      {status === 'loading' && <div className="absolute inset-0 animate-pulse bg-slate-200" />}
      <img
        src={asset.url}
        alt={alt || asset.alt}
        loading="lazy"
        decoding="async"
        width={asset.width}
        height={asset.height}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          status === 'loaded' ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}
