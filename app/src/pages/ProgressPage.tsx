import { useEffect, useState } from 'react';
import { Award, TrendingUp, Clock, Target, Percent } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getAssessment, completeAssessment, getWeeklyReport } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { LoadingScreen } from '../components/ui/Spinner';
import { DayRoute } from '../components/DayRoute';
import type { Assessment, AssessmentResult, WeeklyReport } from '../types';

const SKILL_LABELS: Record<string, string> = {
  speaking: 'Hablar',
  listening: 'Escuchar',
  vocabulary: 'Vocabulario',
  grammar: 'Gramática',
  conversation: 'Conversación',
  confidence: 'Confianza',
};

export function ProgressPage() {
  const { progress, refreshAll } = useAppStore();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [report, setReport] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (progress && progress.daysCompleted >= 21) {
      getWeeklyReport().then(setReport).catch(() => setReport(null));
    }
  }, [progress]);

  if (!progress) return <LoadingScreen label="Cargando tu progreso…" />;

  const isChampion = progress.daysCompleted >= 21;

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold tracking-tight">Progreso</h1>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="num text-3xl font-bold text-primary-600">{progress.totalXp}</p>
            <p className="text-xs text-slate-500">Puntos XP · {progress.level}</p>
          </div>
          <div className="text-right">
            <p className="num text-3xl font-bold text-orange-500">🔥 {progress.streaks.currentStreak}</p>
            <p className="text-xs text-slate-500">días seguidos</p>
          </div>
        </div>
        {progress.levelProgress.next && (
          <div className="mt-4">
            <ProgressBar value={progress.levelProgress.pct} />
            <p className="mt-1 text-xs text-slate-500">
              {progress.level} → {progress.levelProgress.next.label}
            </p>
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <p className="mb-2 font-semibold">Días completados</p>
        <DayRoute
          days={Array.from({ length: 21 }, (_, i) => i + 1).map((d) => ({
            day: d,
            completed: progress.completedDays.includes(d),
            locked: false,
          }))}
          currentDay={isChampion ? undefined : progress.daysCompleted + 1}
        />
      </Card>

      <Card className="mt-4">
        <p className="mb-2 flex items-center gap-2 font-semibold">
          <Award className="h-4 w-4 text-amber-500" /> Insignias
        </p>
        <div className="flex flex-wrap gap-2">
          {progress.allBadges.map((b) => {
            const earned = progress.badges.includes(b.id);
            return (
              <div
                key={b.id}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  earned ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-400'
                }`}
                title={b.desc}
              >
                {earned ? '🏅 ' : '○ '}
                {b.label}
              </div>
            );
          })}
        </div>
      </Card>

      {isChampion && report && (
        <Card className="mt-4">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <TrendingUp className="h-4 w-4 text-primary-600" /> Reporte semanal
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
              <Clock className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-lg font-bold">{report.practiceMinutes}</p>
                <p className="text-[10px] text-slate-500">min practicados</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
              <Percent className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-lg font-bold">{report.accuracy}%</p>
                <p className="text-[10px] text-slate-500">precisión</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-lg font-bold">{report.vocabulary}</p>
                <p className="text-[10px] text-slate-500">palabras nuevas</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
              <Target className="h-5 w-5 text-rose-600" />
              <div>
                <p className="text-lg font-bold">{SKILL_LABELS[report.focusNextWeek] ?? report.focusNextWeek}</p>
                <p className="text-[10px] text-slate-500">foco la próxima semana</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {report.daysPracticed} días practicados · 🔥 {report.currentStreak} racha · {report.speakingMinutes} min de speaking
          </p>
        </Card>
      )}

      {isChampion && !progress.profile && (
        <Card className="mt-4 border-primary-200 bg-gradient-to-br from-primary-50 to-white">
          <p className="font-bold text-primary-700">🎉 ¡Completaste el reto de 21 días!</p>
          <p className="mt-1 text-sm text-slate-600">Construiste tu base. Tu viaje de inglés apenas comienza.</p>
          {!assessment && (
            <Button className="mt-3 w-full" variant="secondary" onClick={async () => setAssessment(await getAssessment())}>
              VER MI PRÓXIMO PLAN
            </Button>
          )}
          {assessment && !result && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">{assessment.title}</p>
              <p className="mb-3 text-xs text-slate-500">{assessment.description}</p>
              <div className="space-y-2">
                {assessment.sections.map((s) => (
                  <div key={s.key}>
                    <div className="flex justify-between text-xs">
                      <span>{s.label}</span>
                      <span>{scores[s.key] ?? 0}/100</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={scores[s.key] ?? 0}
                      onChange={(e) => setScores((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <Button
                className="mt-4 w-full"
                onClick={async () => {
                  const r = await completeAssessment(scores);
                  setResult(r);
                  await refreshAll();
                }}
              >
                Generar mi perfil
              </Button>
            </div>
          )}
          {result && (
            <div className="mt-4 rounded-xl bg-white p-4">
              <p className="text-sm font-bold">TU PERFIL DE INGLÉS</p>
              <p className="mt-2 text-xs text-slate-500">Nivel actual</p>
              <p className="text-lg font-bold">{result.profile.level}</p>
              <p className="mt-2 text-xs text-slate-500">Habilidad más fuerte</p>
              <p className="font-semibold">{SKILL_LABELS[result.profile.strongestSkill] ?? result.profile.strongestSkill}</p>
              <p className="mt-2 text-xs text-slate-500">Necesita mejorar</p>
              <p className="font-semibold">
                {result.profile.needsImprovement.map((s) => SKILL_LABELS[s] ?? s).join(', ')}
              </p>
              <p className="mt-2 text-xs text-slate-500">Práctica recomendada</p>
              <p className="font-semibold">{result.profile.recommendedPractice}</p>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-2 flex items-center gap-1 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4 text-primary-600" /> TUS PRÓXIMOS 30 DÍAS
                </p>
                {result.plan?.weeks?.map((w) => (
                  <div key={w.week} className="flex justify-between text-sm">
                    <span className="text-slate-600">Semana {w.week}</span>
                    <span className="font-medium">{w.focus}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
