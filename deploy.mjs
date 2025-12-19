/**
 * Deploy Script para Oráculo
 * Sube la aplicación a Hostinger vía FTP
 *
 * Uso:
 *   npm run deploy        # Deploy completo
 *   npm run deploy:dry    # Solo muestra qué se subiría
 */

import { Client } from 'basic-ftp';
import { config } from 'dotenv';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Cargar variables de entorno
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración FTP desde .env
const FTP_CONFIG = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  remotePath: process.env.FTP_REMOTE_PATH,
  secure: false // Hostinger usa FTP sin SSL por defecto
};

// Archivos y carpetas a subir (solo producción)
const INCLUDE = [
  'index.html',
  'favicon.svg',
  'css',
  'js'
];

// Archivos a excluir dentro de las carpetas incluidas
const EXCLUDE_PATTERNS = [
  /\.map$/,           // Source maps
  /\.test\.js$/,      // Tests
  /\.spec\.js$/,      // Specs
  /\.md$/,            // Markdown
  /node_modules/,     // Node modules
  /\.git/,            // Git
  /\.env/,            // Env files
  /\.DS_Store/,       // macOS
  /Thumbs\.db/        // Windows
];

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

async function getFilesToUpload(basePath, subPath = '') {
  const files = [];
  const currentPath = join(basePath, subPath);

  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = join(subPath, entry.name);
    const fullPath = join(basePath, relativePath);

    if (shouldExclude(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await getFilesToUpload(basePath, relativePath);
      files.push(...subFiles);
    } else {
      const stats = await stat(fullPath);
      files.push({
        localPath: fullPath,
        remotePath: relativePath.replace(/\\/g, '/'),
        size: stats.size
      });
    }
  }

  return files;
}

async function collectAllFiles() {
  const allFiles = [];

  for (const item of INCLUDE) {
    const fullPath = join(__dirname, item);

    try {
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        const dirFiles = await getFilesToUpload(__dirname, item);
        allFiles.push(...dirFiles);
      } else {
        allFiles.push({
          localPath: fullPath,
          remotePath: item,
          size: stats.size
        });
      }
    } catch (error) {
      log(`  Advertencia: ${item} no encontrado`, 'yellow');
    }
  }

  return allFiles;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function deploy(dryRun = false) {
  console.log('\n');
  log('═══════════════════════════════════════════', 'cyan');
  log('     ORÁCULO - Deploy a Hostinger', 'bright');
  log('═══════════════════════════════════════════', 'cyan');
  console.log('\n');

  // Verificar configuración
  if (!FTP_CONFIG.host || !FTP_CONFIG.user || !FTP_CONFIG.password) {
    log('Error: Faltan credenciales FTP en el archivo .env', 'red');
    log('Asegúrate de tener: FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_REMOTE_PATH', 'yellow');
    process.exit(1);
  }

  log(`Host: ${FTP_CONFIG.host}`, 'blue');
  log(`Usuario: ${FTP_CONFIG.user}`, 'blue');
  log(`Destino: ${FTP_CONFIG.remotePath}`, 'blue');
  console.log('\n');

  // Recolectar archivos
  log('Analizando archivos...', 'yellow');
  const files = await collectAllFiles();
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  log(`\nArchivos a subir: ${files.length}`, 'green');
  log(`Tamaño total: ${formatSize(totalSize)}`, 'green');
  console.log('\n');

  // Mostrar lista de archivos
  log('Archivos:', 'cyan');
  for (const file of files) {
    log(`  ${file.remotePath} (${formatSize(file.size)})`, 'reset');
  }
  console.log('\n');

  if (dryRun) {
    log('═══════════════════════════════════════════', 'yellow');
    log('  MODO DRY-RUN: No se subió nada', 'yellow');
    log('═══════════════════════════════════════════', 'yellow');
    return;
  }

  // Conectar y subir
  const client = new Client();
  client.ftp.verbose = false;

  try {
    log('Conectando al servidor FTP...', 'yellow');
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      secure: FTP_CONFIG.secure
    });
    log('Conectado!', 'green');

    // Ir al directorio remoto
    log(`Navegando a ${FTP_CONFIG.remotePath}...`, 'yellow');
    await client.cd(FTP_CONFIG.remotePath);

    // Subir archivos
    let uploaded = 0;
    for (const file of files) {
      uploaded++;
      const progress = `[${uploaded}/${files.length}]`;
      log(`${progress} Subiendo: ${file.remotePath}...`, 'blue');

      // Crear directorio si no existe
      const dir = file.remotePath.split('/').slice(0, -1).join('/');
      if (dir) {
        await client.ensureDir(dir);
        await client.cd(FTP_CONFIG.remotePath); // Volver al root
      }

      await client.uploadFrom(file.localPath, file.remotePath);
    }

    console.log('\n');
    log('═══════════════════════════════════════════', 'green');
    log('     DEPLOY COMPLETADO EXITOSAMENTE!', 'green');
    log('═══════════════════════════════════════════', 'green');
    log(`\n  URL: https://oraculo.movimientofuncional.app\n`, 'cyan');

  } catch (error) {
    log(`\nError durante el deploy: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    client.close();
  }
}

// Ejecutar
const isDryRun = process.argv.includes('--dry-run');
deploy(isDryRun);
