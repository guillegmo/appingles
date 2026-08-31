const API_BASE = import.meta.env.VITE_API_URL || '/api';

// El backend guarda rutas relativas (/api/images/...). En dev, VITE_API_URL
// es relativo ('/api') y el proxy de Vite las resuelve contra el mismo origen.
// En producción, VITE_API_URL es una URL absoluta a otro dominio (Render) — si
// dejamos la ruta relativa, el navegador la resuelve contra el origen de la
// página (el frontend), no contra la API, y la imagen nunca carga.
export function resolveAssetUrl(url: string) {
  if (/^https?:\/\//i.test(API_BASE)) {
    return new URL(url, API_BASE).href;
  }
  return url;
}
