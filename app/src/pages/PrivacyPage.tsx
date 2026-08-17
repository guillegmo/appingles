import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2, ShieldCheck, Lock } from 'lucide-react';
import { exportUserData, deleteUserData, clearSession } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function PrivacyPage() {
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await exportUserData();
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appingles-data-${res.userId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Export descargado. Contiene tus datos personales en formato JSON.');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setErr(null);
    try {
      await deleteUserData();
      await clearSession().catch(() => {});
      logout();
      navigate('/login');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold">Privacidad</h1>
      <p className="mt-1 text-sm text-slate-500">Tus datos son tuyos. Exporta o elimina lo que quieras (GDPR).</p>

      <Card className="mt-4">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Tu información
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Guardamos tu progreso, rachas, intentos de ejercicios, conversaciones con el tutor IA y eventos de uso para
          personalizar tu aprendizaje. Nunca vendemos datos.
        </p>
      </Card>

      {msg && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}
      {err && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}

      <Card className="mt-4">
        <p className="flex items-center gap-2 font-semibold">
          <Download className="h-4 w-4 text-primary-600" /> Exportar datos
        </p>
        <p className="mt-1 text-sm text-slate-500">Descarga una copia JSON con todo lo que guardamos de tu cuenta.</p>
        <Button className="mt-3 w-full" variant="secondary" onClick={handleExport} disabled={busy}>
          <Download className="mr-1 h-4 w-4" /> Descargar mis datos
        </Button>
      </Card>

      <Card className="mt-4 border-rose-200">
        <p className="flex items-center gap-2 font-semibold text-rose-700">
          <Trash2 className="h-4 w-4" /> Eliminar todos mis datos
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Elimina permanentemente progreso, badges, historial IA y suscripción. No se puede deshacer.
        </p>
        {!confirming ? (
          <Button className="mt-3 w-full" variant="outline" onClick={() => setConfirming(true)}>
            <Trash2 className="mr-1 h-4 w-4" /> Eliminar mis datos
          </Button>
        ) : (
          <div className="mt-3">
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <Lock className="mr-1 inline h-3 w-3" /> Confirmación: se borrará todo tu historial.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button className="bg-rose-600 hover:bg-rose-700" onClick={handleDelete} disabled={busy}>
                Sí, eliminar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}