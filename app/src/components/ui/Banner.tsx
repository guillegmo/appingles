import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

// Aviso informativo temporal (estilo banner) para mensajes que no son errores,
// p. ej. "Se cerró tu sesión en el otro dispositivo".
export function Banner() {
  const notice = useAppStore((s) => s.notice);
  const setNotice = useAppStore((s) => s.setNotice);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  if (!notice) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-30 flex justify-center p-3">
      <div className="flex w-full max-w-lg items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-800 shadow-lg">
        <span className="flex-1">{notice}</span>
        <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice(null)} className="shrink-0 text-primary-400 hover:text-primary-700">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}