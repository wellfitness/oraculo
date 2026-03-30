/**
 * Oráculo - Build Extension
 *
 * Empaqueta la extensión Chrome en dist-extension/
 * Uso: node build-extension.mjs
 */

import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DIST = resolve(ROOT, 'dist-extension');

console.log('Building Oráculo Chrome Extension...\n');

// 1. Limpiar dist-extension/
if (existsSync(DIST)) {
  rmSync(DIST, { recursive: true });
  console.log('  Limpiado dist-extension/');
}
mkdirSync(DIST, { recursive: true });

// 2. Copiar archivos de la extensión (raíz)
cpSync(resolve(ROOT, 'extension/manifest.json'), resolve(DIST, 'manifest.json'));
cpSync(resolve(ROOT, 'extension/background.js'), resolve(DIST, 'background.js'));
cpSync(resolve(ROOT, 'extension/init-extension.js'), resolve(DIST, 'init-extension.js'));

// sidepanel.html: ajustar rutas relativas (extension/ -> raíz de dist)
let sidepanelHtml = readFileSync(resolve(ROOT, 'extension/sidepanel.html'), 'utf-8');
sidepanelHtml = sidepanelHtml
  .replace(/\.\.\/css\//g, 'css/')
  .replace(/\.\.\/js\//g, 'js/')
  .replace(/icons\/icon-128\.png/g, 'icons/icon-128.png');
writeFileSync(resolve(DIST, 'sidepanel.html'), sidepanelHtml);
console.log('  Copiados manifest.json, background.js, sidepanel.html (rutas ajustadas)');

// 3. Copiar iconos de la extensión
mkdirSync(resolve(DIST, 'icons'), { recursive: true });
cpSync(resolve(ROOT, 'extension/icons'), resolve(DIST, 'icons'), { recursive: true });
// Logo para el header
if (existsSync(resolve(ROOT, 'icons/icon-192x192.png'))) {
  cpSync(resolve(ROOT, 'icons/icon-192x192.png'), resolve(DIST, 'icons/icon-192x192.png'));
}
console.log('  Copiados iconos');

// 4. Copiar CSS
mkdirSync(resolve(DIST, 'css'), { recursive: true });
cpSync(resolve(ROOT, 'css/style.css'), resolve(DIST, 'css/style.css'));
cpSync(resolve(ROOT, 'extension/css'), resolve(DIST, 'css'), { recursive: true });
console.log('  Copiados estilos');

// 5. Copiar JS (excepto supabase/ y config.js)
mkdirSync(resolve(DIST, 'js'), { recursive: true });

// Copiar archivos JS raíz (excepto config.js)
const jsFiles = ['app.js', 'storage-hybrid.js', 'storage-local.js', 'storage.js'];
for (const file of jsFiles) {
  const src = resolve(ROOT, 'js', file);
  if (existsSync(src)) {
    cpSync(src, resolve(DIST, 'js', file));
  }
}

// Copiar subdirectorios de JS (excepto supabase/)
const jsDirs = ['modules', 'components', 'data', 'utils', 'gdrive'];
for (const dir of jsDirs) {
  const src = resolve(ROOT, 'js', dir);
  if (existsSync(src)) {
    cpSync(src, resolve(DIST, 'js', dir), { recursive: true });
  }
}
console.log('  Copiados JS (sin supabase/ ni config.js)');

// 6. Copiar sonidos
if (existsSync(resolve(ROOT, 'sounds'))) {
  cpSync(resolve(ROOT, 'sounds'), resolve(DIST, 'sounds'), { recursive: true });
  console.log('  Copiados sonidos');
}

// 7. Copiar favicon
if (existsSync(resolve(ROOT, 'favicon.svg'))) {
  cpSync(resolve(ROOT, 'favicon.svg'), resolve(DIST, 'favicon.svg'));
}

// 8. Generar ZIP para descarga desde la web
import { execSync } from 'child_process';
try {
  const zipDest = resolve(ROOT, 'dist/oraculo-extension.zip');
  execSync(`powershell -Command "Compress-Archive -Path '${DIST}/*' -DestinationPath '${zipDest}' -Force"`, { stdio: 'pipe' });
  console.log('  Generado dist/oraculo-extension.zip');
} catch (e) {
  console.warn('  No se pudo generar ZIP (PowerShell no disponible)');
}

console.log('\nBuild completado en dist-extension/');
console.log('\nPara cargar en Chrome:');
console.log('  1. Ir a chrome://extensions/');
console.log('  2. Activar "Modo desarrollador"');
console.log('  3. "Cargar extensión sin empaquetar" -> seleccionar dist-extension/');
