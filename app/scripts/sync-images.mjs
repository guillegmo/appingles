// scripts/sync-images.mjs
// Redimensiona/comprime content/images/*.jpg (curadas con el MCP StockImages,
// a resolución original de banco de fotos — hasta varios MB c/u) a public/images/
// para que Vite las sirva como estáticos del propio frontend. La UI nunca las
// muestra a más de 176px (h-44 en QuestionCard) aunque en pantallas retina
// convenga algo de margen, así que 480px de lado más largo + JPEG calidad 78
// es de sobra: baja el peso típico de cientos de KB–varios MB a decenas de KB,
// que es lo que realmente causaba el retraso al voltear cartas en Memory Match.
// content/images/ (el original sin tocar) sigue siendo la fuente curada; esto
// solo afecta a la copia que se sirve.
import { readdir, mkdir, stat } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', '..', 'content', 'images');
const DEST_DIR = join(__dirname, '..', 'public', 'images');
const MAX_DIMENSION = 480;
const JPEG_QUALITY = 78;

async function needsProcessing(srcPath, destPath) {
  try {
    const [srcStat, destStat] = await Promise.all([stat(srcPath), stat(destPath)]);
    return srcStat.mtimeMs > destStat.mtimeMs;
  } catch {
    return true; // destino no existe todavía
  }
}

async function main() {
  await mkdir(DEST_DIR, { recursive: true });
  const entries = await readdir(SRC_DIR);
  const images = entries.filter((f) => extname(f).toLowerCase() === '.jpg');

  let processed = 0;
  let skipped = 0;

  await Promise.all(
    images.map(async (f) => {
      const srcPath = join(SRC_DIR, f);
      const destPath = join(DEST_DIR, f);
      if (!(await needsProcessing(srcPath, destPath))) {
        skipped++;
        return;
      }
      await sharp(srcPath)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toFile(destPath);
      processed++;
    }),
  );

  console.log(`sync-images: ${processed} procesadas, ${skipped} sin cambios (public/images/)`);
}

main().catch((err) => {
  console.error('sync-images falló:', err);
  process.exit(1);
});
