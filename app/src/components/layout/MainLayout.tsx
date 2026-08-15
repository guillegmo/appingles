import { NavLink, Outlet } from 'react-router-dom';
import { Home, Dumbbell, Bot, TrendingUp, User } from 'lucide-react';
import { cn } from '../../utils/cn';

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
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium',
                  isActive ? 'text-primary-600' : 'text-slate-400',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
