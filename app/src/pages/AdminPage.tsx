import { Fragment, useEffect, useMemo, useState } from 'react';
import { Plus, ListFilter, Rocket, Loader2, Users, Ban, CheckCircle2, KeyRound, Search, Eye, EyeOff, Check, X } from 'lucide-react';
import {
  generateContentDraft,
  listContentDrafts,
  publishContentDraft,
  getAdminUsers,
  setAdminUserStatus,
  setAdminUserPassword,
} from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { AdminDraftSummary, AdminUserSummary } from '../types';

const SKILLS = ['speaking', 'listening', 'vocabulary', 'grammar', 'conversation'];
const SITUATIONS = ['travel', 'work', 'social', 'shopping', 'restaurant', 'phone', 'interviews'];

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un carácter especial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function AdminPage() {
  const [tab, setTab] = useState<'generate' | 'drafts' | 'users'>('generate');
  const [skill, setSkill] = useState('conversation');
  const [situation, setSituation] = useState('social');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [items, setItems] = useState<AdminDraftSummary[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [userActionId, setUserActionId] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [passwordEditFor, setPasswordEditFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.email ?? u.userId).toLowerCase().includes(q));
  }, [users, userQuery]);

  const load = async (status?: string) => {
    try {
      const res = await listContentDrafts(status);
      setItems(res.items);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await getAdminUsers();
      setUsers(res.items);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  useEffect(() => {
    if (tab === 'drafts') load();
    if (tab === 'users') loadUsers();
  }, [tab]);

  const handleToggleStatus = async (u: AdminUserSummary) => {
    setUserActionId(u.userId);
    setErr(null);
    setMsg(null);
    try {
      await setAdminUserStatus(u.userId, u.active ? 'canceled' : 'active');
      setMsg(u.active ? `Acceso inactivado para ${u.email ?? u.userId}.` : `Acceso reactivado para ${u.email ?? u.userId}.`);
      await loadUsers();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUserActionId(null);
    }
  };

  const openPasswordForm = (u: AdminUserSummary) => {
    setErr(null);
    setMsg(null);
    setNewPassword('');
    setShowNewPassword(false);
    setPasswordEditFor(passwordEditFor === u.userId ? null : u.userId);
  };

  const passwordChecks = PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(newPassword) }));
  const passwordValid = passwordChecks.every((c) => c.ok);

  const handleSetPassword = async (u: AdminUserSummary) => {
    if (!passwordValid) return;
    setUserActionId(u.userId);
    setErr(null);
    setMsg(null);
    try {
      await setAdminUserPassword(u.userId, newPassword);
      setMsg(
        `Contraseña asignada para ${u.email ?? u.userId}. Compártela con la persona por un canal seguro — se le pedirá cambiarla al entrar.`,
      );
      setPasswordEditFor(null);
      setNewPassword('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUserActionId(null);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await generateContentDraft({ skill, situation, topic: topic.trim() });
      setMsg(`Draft creado: ${res.lesson.title} (${res.lesson.mock ? 'mock dev' : 'Groq'}). Revisa y publica.`);
      setTopic('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (id: string) => {
    setErr(null);
    try {
      await publishContentDraft(id);
      setMsg('Lección publicada. Ya aparece en Continuous Learning.');
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold">Admin · Contenido</h1>
      <p className="text-sm text-slate-500">Generación IA con flujo draft → publicado.</p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setTab('generate')}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
            tab === 'generate' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Plus className="h-3.5 w-3.5" /> Generar
        </button>
        <button
          onClick={() => setTab('drafts')}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
            tab === 'drafts' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <ListFilter className="h-3.5 w-3.5" /> Borradores ({items.length})
        </button>
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
            tab === 'users' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Usuarios ({users.length})
        </button>
      </div>

      {msg && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{msg}</p>}
      {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}

      {tab === 'generate' && (
        <Card className="mt-4">
          <p className="text-sm font-semibold">Nueva lección</p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Skill</p>
              <div className="flex flex-wrap gap-1.5">
                {SKILLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSkill(s)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      skill === s ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Situation</p>
              <div className="flex flex-wrap gap-1.5">
                {SITUATIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSituation(s)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      situation === s ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic, p.ej. 'Ordering coffee'"
              className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-primary-500"
            />
            <Button className="w-full" size="lg" onClick={handleGenerate} disabled={generating || !topic.trim()}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Generar borrador
            </Button>
          </div>
        </Card>
      )}

      {tab === 'drafts' && (
        <div className="mt-4 space-y-2">
          {items.map((d) => (
            <Card key={d.id} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold">{d.title}</p>
                <p className="text-xs capitalize text-slate-500">
                  {d.skill} · {d.situation}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${d.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {d.status}
                  </span>
                </p>
              </div>
              {d.status === 'draft' && (
                <Button size="sm" onClick={() => handlePublish(d.id)}>
                  Publicar
                </Button>
              )}
            </Card>
          ))}
          {items.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Sin drafts. Genera uno.</p>}
        </div>
      )}

      {tab === 'users' && (
        <div className="mt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Buscar por correo (parte o completo)…"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 text-sm outline-none focus:border-primary-500"
            />
          </div>

          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Correo</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <Fragment key={u.userId}>
                    <tr className="align-top hover:bg-slate-50/70">
                      <td className="max-w-[220px] truncate px-3 py-2 font-medium" title={u.email ?? u.userId}>
                        {u.email ?? u.userId}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 capitalize text-slate-500">{u.plan}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {u.active ? 'activo' : 'inactivo'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant={u.active ? 'danger' : 'primary'}
                            onClick={() => handleToggleStatus(u)}
                            disabled={userActionId === u.userId}
                          >
                            {userActionId === u.userId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : u.active ? (
                              <Ban className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            {u.active ? 'Inactivar' : 'Activar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPasswordForm(u)}
                            disabled={userActionId === u.userId}
                          >
                            <KeyRound className="h-3.5 w-3.5" /> Cambiar contraseña
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {passwordEditFor === u.userId && (
                      <tr>
                        <td colSpan={4} className="bg-slate-50 px-3 py-3">
                          <p className="mb-2 text-xs text-slate-500">
                            Asigna una contraseña temporal para <strong>{u.email ?? u.userId}</strong>. Al entrar con
                            ella, se le pedirá crear una nueva que solo esa persona conozca.
                          </p>
                          <div className="flex flex-wrap items-start gap-2">
                            <div className="relative">
                              <input
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="Nueva contraseña temporal"
                                autoComplete="new-password"
                                className="h-10 w-56 rounded-xl border border-slate-300 bg-white px-3 pr-10 text-sm outline-none focus:border-primary-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword((v) => !v)}
                                aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
                              >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSetPassword(u)}
                              disabled={!passwordValid || userActionId === u.userId}
                            >
                              {userActionId === u.userId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <KeyRound className="h-3.5 w-3.5" />
                              )}
                              Asignar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setPasswordEditFor(null)}>
                              Cancelar
                            </Button>
                          </div>
                          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            {passwordChecks.map((c) => (
                              <li
                                key={c.label}
                                className={`flex items-center gap-1 text-[11px] ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}
                              >
                                {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {c.label}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">
              {users.length === 0 ? 'Sin usuarios registrados.' : 'Ningún usuario coincide con la búsqueda.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
