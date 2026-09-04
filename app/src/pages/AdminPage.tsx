import { Fragment, useEffect, useMemo, useState } from 'react';
import { Loader2, Ban, CheckCircle2, KeyRound, Search, Eye, EyeOff, Check, X, Trash2, UserPlus, AlertTriangle } from 'lucide-react';
import { getAdminUsers, setAdminUserStatus, setAdminUserPassword, deleteAdminUser, createAdminUser } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { AdminUserSummary } from '../types';

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un carácter especial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

// Ancho fijo para que los 3 botones de acción (Activar/Inactivar, Cambiar
// contraseña, Borrar cuenta) queden simétricos en escritorio, sin importar
// que "Cambiar contraseña" sea más largo que "Activar". En móvil ya son
// simétricos porque todos usan w-full (ver UserActions con stack=true).
const ACTION_BTN_WIDTH = 'w-[210px] whitespace-nowrap';

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-[70px] rounded-full px-2 py-0.5 text-center text-[10px] font-bold ${
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
      }`}
    >
      {active ? 'activo' : 'inactivo'}
    </span>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  const checks = PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(password) }));
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {checks.map((c) => (
        <li key={c.label} className={`flex items-center gap-1 text-[11px] ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
          {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {c.label}
        </li>
      ))}
    </ul>
  );
}

export function AdminPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [userActionId, setUserActionId] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [passwordEditFor, setPasswordEditFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [deleteConfirmFor, setDeleteConfirmFor] = useState<AdminUserSummary | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPlan, setCreatePlan] = useState<'reto21' | 'premium-lifetime'>('premium-lifetime');
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.email ?? u.userId).toLowerCase().includes(q));
  }, [users, userQuery]);

  const loadUsers = async () => {
    try {
      const res = await getAdminUsers();
      setUsers(res.items);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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

  const confirmDeleteAccount = async () => {
    const u = deleteConfirmFor;
    if (!u) return;
    const label = u.email ?? u.userId;
    setUserActionId(u.userId);
    setErr(null);
    setMsg(null);
    try {
      await deleteAdminUser(u.userId);
      setMsg(`Cuenta de ${label} borrada por completo.`);
      setUsers((prev) => prev.filter((x) => x.userId !== u.userId));
      setDeleteConfirmFor(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUserActionId(null);
    }
  };

  const createChecks = PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(createPassword) }));
  const createPasswordValid = createChecks.every((c) => c.ok);
  const createEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim());

  const resetCreateForm = () => {
    setCreateEmail('');
    setCreateName('');
    setCreatePlan('premium-lifetime');
    setCreatePassword('');
    setShowCreatePassword(false);
  };

  const handleCreateUser = async () => {
    if (!createEmailValid || !createPasswordValid || creating) return;
    setCreating(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await createAdminUser({
        email: createEmail.trim(),
        name: createName.trim() || undefined,
        plan: createPlan,
        password: createPassword,
      });
      setMsg(
        `Cuenta creada para ${res.user.email}. Compártele la contraseña por un canal seguro — se le pedirá cambiarla al entrar.`,
      );
      setUsers((prev) => [res.user, ...prev]);
      resetCreateForm();
      setShowCreate(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  // Botones de acción, reutilizados en la tarjeta móvil y en la fila de la
  // tabla de escritorio. `stack` los pone en columna a ancho completo (móvil).
  function UserActions({ u, stack }: { u: AdminUserSummary; stack: boolean }) {
    const busy = userActionId === u.userId;
    const widthClass = stack ? 'w-full' : ACTION_BTN_WIDTH;
    return (
      <div className={stack ? 'flex flex-col gap-1.5' : 'flex flex-wrap gap-1.5'}>
        <Button size="sm" variant={u.active ? 'danger' : 'primary'} onClick={() => handleToggleStatus(u)} disabled={busy} className={widthClass}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : u.active ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {u.active ? 'Inactivar' : 'Activar'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => openPasswordForm(u)} disabled={busy} className={widthClass}>
          <KeyRound className="h-3.5 w-3.5" /> Cambiar contraseña
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDeleteConfirmFor(u)}
          disabled={busy}
          className={`${widthClass} border-rose-200 text-rose-600 hover:bg-rose-50`}
        >
          <Trash2 className="h-3.5 w-3.5" /> Borrar cuenta
        </Button>
      </div>
    );
  }

  function PasswordAssignForm({ u }: { u: AdminUserSummary }) {
    const busy = userActionId === u.userId;
    return (
      <div className="mt-2 rounded-xl bg-slate-50 p-3">
        <p className="mb-2 text-xs text-slate-500">
          Asigna una contraseña temporal para <strong>{u.email ?? u.userId}</strong>. Al entrar con ella, se le
          pedirá crear una nueva que solo esa persona conozca.
        </p>
        <div className="flex flex-wrap items-start gap-2">
          <div className="relative">
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Nueva contraseña temporal"
              autoComplete="new-password"
              className="h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 pr-10 text-sm outline-none focus:border-primary-500 sm:w-56"
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
          <Button size="sm" onClick={() => handleSetPassword(u)} disabled={!passwordValid || busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
            Asignar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPasswordEditFor(null)}>
            Cancelar
          </Button>
        </div>
        <PasswordChecklist password={newPassword} />
      </div>
    );
  }

  function DeleteConfirmModal() {
    if (!deleteConfirmFor) return null;
    const u = deleteConfirmFor;
    const label = u.email ?? u.userId;
    const busy = userActionId === u.userId;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        onClick={() => !busy && setDeleteConfirmFor(null)}
      >
        <div
          className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 id="delete-modal-title" className="mt-3 text-center text-base font-bold">
            ¿Borrar esta cuenta?
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Vas a borrar <strong className="break-all">{label}</strong> permanentemente: todos sus datos (progreso,
            XP, vocabulario, etc.) y su acceso de inicio de sesión.
          </p>
          <p className="mt-1 text-center text-xs font-semibold text-rose-600">Esta acción no se puede deshacer.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="w-full sm:flex-1" onClick={() => setDeleteConfirmFor(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="w-full whitespace-nowrap sm:flex-1"
              onClick={confirmDeleteAccount}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Borrar cuenta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <DeleteConfirmModal />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Admin · Usuarios</h1>
          <p className="text-sm text-slate-500">Acceso, activación, contraseñas y borrado de cuentas.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          <UserPlus className="h-3.5 w-3.5" /> Crear usuario
        </Button>
      </div>

      {msg && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{msg}</p>}
      {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}

      {showCreate && (
        <Card className="mt-4">
          <p className="text-sm font-semibold">Crear cuenta nueva</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Crea el acceso directamente (sin pasar por Hotmart). Le pedirá cambiar la contraseña al entrar.
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="create-email" className="mb-1 block text-xs font-semibold text-slate-500">
                Correo *
              </label>
              <input
                id="create-email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                type="email"
                placeholder="persona@correo.com"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label htmlFor="create-name" className="mb-1 block text-xs font-semibold text-slate-500">
                Nombre (opcional)
              </label>
              <input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nombre completo"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Plan</p>
              <div className="flex flex-wrap gap-1.5">
                {(['premium-lifetime', 'reto21'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCreatePlan(p)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      createPlan === p ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p === 'premium-lifetime' ? 'Premium (de por vida)' : 'Reto 21 días'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="create-password" className="mb-1 block text-xs font-semibold text-slate-500">
                Contraseña inicial *
              </label>
              <div className="relative">
                <input
                  id="create-password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  type={showCreatePassword ? 'text' : 'password'}
                  placeholder="Contraseña temporal"
                  autoComplete="new-password"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 pr-10 text-sm outline-none focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword((v) => !v)}
                  aria-label={showCreatePassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordChecklist password={createPassword} />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleCreateUser}
                disabled={!createEmailValid || !createPasswordValid || creating}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Crear cuenta
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreate(false);
                  resetCreateForm();
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

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

        {/* Móvil: tarjetas apiladas — una tabla no cabe bien con 3 botones de acción. */}
        <div className="mt-3 space-y-2 md:hidden">
          {filteredUsers.map((u) => (
            <div key={u.userId} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold" title={u.email ?? u.userId}>
                  {u.email ?? u.userId}
                </p>
                <StatusBadge active={u.active} />
              </div>
              <p className="mt-0.5 text-xs capitalize text-slate-500">{u.plan}</p>
              <div className="mt-2">
                <UserActions u={u} stack />
              </div>
              {passwordEditFor === u.userId && <PasswordAssignForm u={u} />}
            </div>
          ))}
        </div>

        {/* Escritorio: tabla compacta a todo el ancho disponible. */}
        <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
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
                      <StatusBadge active={u.active} />
                    </td>
                    <td className="px-3 py-2">
                      <UserActions u={u} stack={false} />
                    </td>
                  </tr>
                  {passwordEditFor === u.userId && (
                    <tr>
                      <td colSpan={4} className="px-3 pb-3">
                        <PasswordAssignForm u={u} />
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
    </div>
  );
}
