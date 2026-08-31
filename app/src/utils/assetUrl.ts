// Las imágenes pedagógicas se sirven como estáticos del propio frontend
// (public/images/, sincronizadas desde content/images/ por
// scripts/sync-images.mjs) en vez de a través de la API — evita que cada
// carga de imagen compita con el rate limiter y el proceso Node de la API
// cuando hay varios usuarios concurrentes. El manifiesto guarda rutas del
// tipo /images/archivo.jpg; solo falta anteponer el base path del deploy
// (BrowserRouter usa el mismo import.meta.env.BASE_URL en App.tsx).
export function resolveAssetUrl(url: string) {
  const base = import.meta.env.BASE_URL; // '/' en dev, '/appingles/' en producción
  return base.replace(/\/$/, '') + url;
}
