// services/tabState.ts
// Estado "pestaña fresca" (mutable). Una pestaña nueva (sessionStorage vacío)
// no debe restaurar automáticamente la sesión anterior de Firebase: se fuerza
// al usuario a partir del login.
//
// El flag es MUTABLE a propósito: antes era una constante a nivel de módulo que
// quedaba en `true` durante toda la vida de la pestaña. Eso hacía que, tras el
// PRIMER login en una pestaña limpia, el handler de onAuthStateChanged se
// saltara el bootstrap (token + registerSession + refreshAll) para siempre y,
// como OnboardingGate bloquea el montaje de Home (único otro lugar que llamaba
// refreshAll), la app quedaba en "Cargando tu progreso…" indefinidamente.
//
// Ahora el flag solo bloquea la restauración automática INICIAL y se limpia en
// cuanto se establece una sesión real (login explícito), permitiendo que el
// flujo de autenticación continúe con normalidad.

const KEY = 'appingles_tab_ready';

const wasFresh = typeof window !== 'undefined' && !sessionStorage.getItem(KEY);

if (wasFresh) {
  sessionStorage.setItem(KEY, '1');
  // Limpieza heredada: estas claves (legado de cuando se usaba localStorage)
  // no deben arrastrarse entre pestañas/navegadores.
  localStorage.removeItem('appingles_user');
  localStorage.removeItem('appingles_token');
  localStorage.removeItem('appingles-store');
}

let fresh = wasFresh;

export function isFreshTab(): boolean {
  return fresh;
}

export function clearFreshTab(): void {
  fresh = false;
}
