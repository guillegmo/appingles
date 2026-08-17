import { NavLink, Outlet } from 'react-router-dom';
import { Home, Dumbbell, Bot, TrendingUp, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Banner } from '../ui/Banner';

const items = [
  { to: '/home', label: 'Inicio', icon: Home },
  { to: '/practice', label: 'Practicar', icon: Dumbbell },
  { to: '/tutor', label: 'Tutor IA', icon: Bot },
  { to: '/progress', label: 'Progreso', icon: TrendingUp },
  { to: '/profile', label: 'Perfil', icon: User },
];

export function MainLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-slate-50">
      <Banner />
      <main className="flex-1 pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-5 pb-[max(env(safe-area-inset-bottom),0.375rem)] pt-1.5">
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
  );
}