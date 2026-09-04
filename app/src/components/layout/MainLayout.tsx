import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Dumbbell, Bot, TrendingUp, User, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Banner } from '../ui/Banner';
import { useAppStore } from '../../store/useAppStore';

const BASE_ITEMS = [
  { to: '/home', label: 'Inicio', icon: Home },
  { to: '/practice', label: 'Practicar', icon: Dumbbell },
  { to: '/tutor', label: 'Tutor IA', icon: Bot },
  { to: '/progress', label: 'Progreso', icon: TrendingUp },
  { to: '/profile', label: 'Perfil', icon: User },
];
const ADMIN_ITEM = { to: '/admin', label: 'Admin', icon: ShieldCheck };

export function MainLayout() {
  const isAdmin = useAppStore((s) => s.isAdmin);
  const items = isAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS;
  // El panel de admin (lista de usuarios) necesita más ancho que el resto de
  // la app (diseñada como un carrusel móvil de max-w-lg incluso en escritorio):
  // ahí se deja usar todo el ancho disponible junto al sidebar.
  const isAdminRoute = useLocation().pathname.startsWith('/admin');
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Panel lateral: solo en pantallas md+ (versión de PC). En móvil el
          nav sigue siendo la barra inferior de siempre. */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-56 flex-col border-r border-slate-200/80 bg-white/90 p-3 backdrop-blur md:flex">
        <div className="px-2 py-3 text-lg font-bold text-primary-700">AppIngles</div>
        <nav className="flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive ? 'bg-primary-50 text-primary-700 shadow-soft' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-5 w-5 shrink-0 transition-transform', isActive && 'scale-110')} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="mx-auto flex min-h-screen max-w-lg flex-col md:ml-56 md:max-w-none md:flex-1">
        <Banner />
        <main className="flex-1 pb-28 md:pb-8">
          <div className={cn('mx-auto w-full', !isAdminRoute && 'max-w-lg md:max-w-3xl')}>
            <Outlet />
          </div>
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200/80 bg-white/90 backdrop-blur md:hidden">
          <div
            className={cn(
              'mx-auto grid max-w-lg pb-[max(env(safe-area-inset-bottom),0.375rem)] pt-1.5',
              isAdmin ? 'grid-cols-6' : 'grid-cols-5',
            )}
          >
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'group flex flex-col items-center gap-1 py-1.5 text-[10px] font-semibold transition-colors',
                    isActive ? 'text-primary-700' : 'text-slate-400 hover:text-slate-600',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200',
                        isActive ? 'bg-primary-50 shadow-soft' : 'bg-transparent group-hover:bg-slate-100',
                      )}
                    >
                      <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}