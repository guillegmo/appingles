import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function ProfilePage() {
  const { user, logout, progress, subscription } = useAppStore();

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold">Perfil</h1>
      <Card className="mt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.id}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-center">
          <div>
            <p className="text-xl font-bold">{progress?.daysCompleted ?? 0}/21</p>
            <p className="text-xs text-slate-500">Días</p>
          </div>
          <div>
            <p className="text-xl font-bold capitalize">{subscription?.status ?? 'free'}</p>
            <p className="text-xs text-slate-500">Plan</p>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <p className="font-semibold">Cuenta</p>
        <Link to="/privacy" className="mt-2 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ShieldCheck className="h-3.5 w-3.5" /> Privacidad y datos
        </Link>
      </Card>

      <Button className="mt-4 w-full" variant="outline" onClick={logout}>
        Cerrar sesión
      </Button>
    </div>
  );
}
