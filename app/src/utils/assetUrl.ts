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

// Dispara la descarga de cada URL apenas se conocen (ej. al llegar la
// respuesta de un día o un tablero de Memory Match), antes de que el <img>
// correspondiente se inserte en el DOM al navegar/voltear una carta. Sin
// esto, el navegador recién pide la imagen en ese momento y la espera de red
// se ve como una tarjeta vacía.
export function preloadImages(urls: (string | null | undefined)[]) {
  const seen = new Set<string>();
  for (const url of urls) {
    if (url && !seen.has(url)) {
      seen.add(url);
      const img = new Image();
      img.src = resolveAssetUrl(url);
    }
  }
}
