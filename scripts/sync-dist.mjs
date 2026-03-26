/**
 * Oraculo - Sync source to dist/
 *
 * Copia archivos fuente a dist/ para Capacitor y deploy.
 * Uso: node scripts/sync-dist.mjs
 */

import { cpSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');

console.log('Syncing source → dist/...\n');

// Archivos individuales
const FILES = [
  'app.html',
  'index.html',
  'manifest.json',
  'service-worker.js',
  'favicon.svg',
  'favicon.ico',
  '.htaccess',
  '404.html',
  'auth.html',
  'auth-callback.html'
];

// Directorios completos
const DIRS = ['css', 'js', 'icons', 'sounds', 'landing'];

let copied = 0;

for (const f of FILES) {
  const src = resolve(ROOT, f);
  if (existsSync(src)) {
    cpSync(src, resolve(DIST, f));
    copied++;
  }
}

for (const d of DIRS) {
  const src = resolve(ROOT, d);
  if (existsSync(src)) {
    cpSync(src, resolve(DIST, d), { recursive: true });
    console.log(`  ${d}/`);
    copied++;
  }
}

console.log(`\n  ${copied} items sincronizados.`);
console.log('  Ejecuta "pnpm exec cap sync" para actualizar el proyecto Android.\n');
