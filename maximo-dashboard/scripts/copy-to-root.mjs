import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const repoRoot = resolve(projectRoot, '..');
const dist = resolve(projectRoot, 'dist');

if (!existsSync(dist)) {
  console.error('dist/ no existe — corre `npm run build` primero.');
  process.exit(1);
}

const entries = readdirSync(dist);
const htmlFile = entries.find((f) => f.toLowerCase().endsWith('.html'));
if (!htmlFile) {
  console.error('No se encontró archivo .html en dist/');
  process.exit(1);
}

const target = resolve(repoRoot, 'dashboard.html');
copyFileSync(resolve(dist, htmlFile), target);

if (htmlFile !== 'dashboard.html') {
  const renamed = resolve(dist, 'dashboard.html');
  try {
    renameSync(resolve(dist, htmlFile), renamed);
  } catch {}
}

console.log(`OK: dashboard.html copiado a ${target}`);
void mkdirSync;
void join;
