#!/usr/bin/env node
/**
 * Oráculo - Script de Versionado Automático
 *
 * Incrementa la versión en todos los archivos necesarios:
 * - package.json
 * - service-worker.js (CACHE_NAME y STATIC_CACHE)
 *
 * Uso:
 *   node scripts/bump-version.mjs patch   # 1.5.0 → 1.5.1 (default)
 *   node scripts/bump-version.mjs minor   # 1.5.0 → 1.6.0
 *   node scripts/bump-version.mjs major   # 1.5.0 → 2.0.0
 *   node scripts/bump-version.mjs 1.6.0   # Versión específica
 */

import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());

// Archivos a actualizar
const FILES = {
  package: path.join(ROOT_DIR, 'package.json'),
  serviceWorker: path.join(ROOT_DIR, 'service-worker.js'),
  distServiceWorker: path.join(ROOT_DIR, 'dist', 'service-worker.js')
};

/**
 * Lee la versión actual de package.json
 */
function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(FILES.package, 'utf8'));
  return pkg.version;
}

/**
 * Calcula la nueva versión
 */
function calculateNewVersion(currentVersion, bumpType) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      // Si es una versión específica (ej: "1.6.0")
      if (/^\d+\.\d+\.\d+$/.test(bumpType)) {
        return bumpType;
      }
      // Default a patch
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Actualiza package.json
 */
function updatePackageJson(newVersion) {
  const pkg = JSON.parse(fs.readFileSync(FILES.package, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(FILES.package, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  ✓ package.json → ${newVersion}`);
}

/**
 * Actualiza service-worker.js
 */
function updateServiceWorker(filePath, newVersion) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠ ${path.basename(filePath)} no encontrado`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const cacheVersion = `v${newVersion.replace(/\./g, '.')}`;

  // Actualizar CACHE_NAME
  content = content.replace(
    /const CACHE_NAME = 'oraculo-v[\d.]+'/,
    `const CACHE_NAME = 'oraculo-${cacheVersion}'`
  );

  // Actualizar STATIC_CACHE
  content = content.replace(
    /const STATIC_CACHE = 'oraculo-static-v[\d.]+'/,
    `const STATIC_CACHE = 'oraculo-static-${cacheVersion}'`
  );

  fs.writeFileSync(filePath, content);
  console.log(`  ✓ ${path.basename(filePath)} → oraculo-${cacheVersion}`);
}

/**
 * Función principal
 */
function main() {
  const bumpType = process.argv[2] || 'patch';
  const currentVersion = getCurrentVersion();
  const newVersion = calculateNewVersion(currentVersion, bumpType);

  console.log(`\n🔄 Actualizando versión: ${currentVersion} → ${newVersion}\n`);

  // Actualizar archivos
  updatePackageJson(newVersion);
  updateServiceWorker(FILES.serviceWorker, newVersion);
  updateServiceWorker(FILES.distServiceWorker, newVersion);

  console.log(`\n✅ Versión actualizada a ${newVersion}`);
  console.log('\n📋 Próximos pasos:');
  console.log('   1. Verificar los cambios: git diff');
  console.log('   2. Commit: git add . && git commit -m "chore: bump version to ' + newVersion + '"');
  console.log('   3. Deploy: npm run deploy\n');
}

main();
