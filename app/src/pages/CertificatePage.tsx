import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award } from 'lucide-react';
import { getProgress } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function CertificatePage() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    getProgress().then((p) => setEligible(p.completedDays?.includes(21) ?? false)).catch(() => setEligible(false));
  }, []);

  if (!eligible) {
    return (
      <div className="p-5">
        <h1 className="text-xl font-bold">Certificado</h1>
        <Card className="mt-4 py-8 text-center text-sm text-slate-500">
          Completa los 21 días del reto para obtener tu certificado.
        </Card>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-5">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Award className="h-5 w-5 text-amber-500" /> Mi certificado
      </h1>
      <div className="mt-4 rounded-2xl border-4 border-double border-primary-300 bg-gradient-to-br from-white to-primary-50 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">Certificado de logro</p>
        <p className="mt-4 text-sm text-slate-500">Se certifica que</p>
        <p className="mt-1 text-2xl font-black text-slate-800">{user?.name ?? 'Estudiante'}</p>
        <p className="mt-3 text-sm text-slate-600">
          completó el <strong>Reto de 21 Días</strong> del programa de inglés, practicando a diario y construyendo el hábito de
          hablar en inglés.
        </p>
        <p className="mt-4 text-xs text-slate-400">{today}</p>
      </div>
      <Button className="mt-5 w-full" size="lg" onClick={() => window.print()}>
        Guardar / Imprimir
      </Button>
      <Button className="mt-2 w-full" variant="secondary" onClick={() => navigate('/home')}>
        Volver al inicio
      </Button>
    </div>
  );
}