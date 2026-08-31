// scripts/sync-images.mjs
// Copia content/images/*.jpg (curadas con el MCP StockImages) a public/images/
// para que Vite las sirva como estáticos del propio frontend — evita que cada
// carga de imagen pase por el rate limiter y el proceso Node de la API, que
// se vuelve cuello de botella con varios usuarios concurrentes.
import { readdir, mkdir, copyFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', '..', 'content', 'images');
const DEST_DIR = join(__dirname, '..', 'public', 'images');

async function main() {
  await mkdir(DEST_DIR, { recursive: true });
  const entries = await readdir(SRC_DIR);
  const images = entries.filter((f) => extname(f).toLowerCase() === '.jpg');

  await Promise.all(images.map((f) => copyFile(join(SRC_DIR, f), join(DEST_DIR, f))));

  console.log(`sync-images: ${images.length} imágenes copiadas a public/images/`);
}

main().catch((err) => {
  console.error('sync-images falló:', err);
  process.exit(1);
});
