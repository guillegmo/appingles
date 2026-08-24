import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';

const LANDING_URL = 'https://www.ingresosdigitalesit.com/reto21ingles';

export function NoAccessPage() {
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Tu acceso aún no está activo</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Iniciaste sesión correctamente, pero no encontramos una compra activa del{' '}
          <strong>Reto de Inglés en 21 Días</strong> asociada a tu cuenta.
        </p>
        <div className="mt-8 space-y-3">
          <Button size="lg" className="w-full" onClick={() => navigate('/activar-acceso')}>
            Solicitar enlace de activación
          </Button>
          <a href={LANDING_URL} target="_blank" rel="noreferrer" className="block">
            <Button variant="outline" size="lg" className="w-full">
              Ver el Reto de 21 Días
            </Button>
          </a>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Cerrar sesión
          </Button>
        </div>
        <p className="mt-6 text-xs text-slate-400">
          ¿Compraste hace poco? El correo de activación puede tardar unos minutos en llegar. Revisa
          spam o promociones.
        </p>
      </div>
    </div>
  );
}
