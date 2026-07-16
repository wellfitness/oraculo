/**
 * Deploy Script para Oráculo
 * Sube la aplicación a Hostinger vía FTP
 */

import { Client } from 'basic-ftp';
import { config } from 'dotenv';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST_DIR = join(__dirname, 'dist');

const FTP_CONFIG = {
  host: process.env.FTP_HOST,
  port: parseInt(process.env.FTP_PORT || '21', 10),
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  secure: (process.env.FTP_SECURE || 'false').toLowerCase() === 'true'
};

const FTP_REMOTE_PATH = process.env.FTP_REMOTE_PATH || '/';

// Archivos y carpetas a subir
const INCLUDE = [
  '.htaccess',
  '404.html',
  'index.html',
  'app.html',
  'aviso-legal.html',
  'privacidad.html',
  'terminos.html',
  'css',
  'landing.css',
  'js',
  'manifest.json',
  'service-worker.js',
  'robots.txt',
  'sitemap.xml',
  'favicon.svg',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon-192x192.png',
  'favicon-512x512.png',
  'apple-touch-icon.png',
  'portada.webp',
  // 'logo.png', // No subir - es muy grande (900KB)
  'icons',
  'landing',
  'sounds',
  'oraculo-extension.zip'
];

const EXCLUDE = [/\.map$/, /\.test\.js$/, /\.md$/, /node_modules/, /\.git/, /\.env/];

function shouldExclude(path) {
  return EXCLUDE.some(p => p.test(path));
}

async function getAllFiles(basePath, subPath = '') {
  const files = [];
  const currentPath = join(basePath, subPath);

  try {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = subPath ? `${subPath}/${entry.name}` : entry.name;

      if (shouldExclude(relativePath)) continue;

      if (entry.isDirectory()) {
        files.push(...await getAllFiles(basePath, relativePath));
      } else {
        const stats = await stat(join(basePath, relativePath));
        files.push({
          local: join(basePath, relativePath),
          remote: relativePath,
          size: stats.size
        });
      }
    }
  } catch (e) {
    // Ignore errors
  }

  return files;
}

async function collectFiles() {
  const allFiles = [];

  for (const item of INCLUDE) {
    const fullPath = join(DIST_DIR, item);

    try {
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        allFiles.push(...await getAllFiles(DIST_DIR, item));
      } else {
        allFiles.push({
          local: fullPath,
          remote: item,
          size: stats.size
        });
      }
    } catch (e) {
      console.log(`⚠️  No encontrado: ${item}`);
    }
  }

  return allFiles;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function deploy() {
  console.log('\n🔮 ORÁCULO - Deploy a Hostinger\n');
  console.log(`Host: ${FTP_CONFIG.host}`);
  console.log(`Usuario: ${FTP_CONFIG.user}\n`);

  if (!FTP_CONFIG.host || !FTP_CONFIG.user || !FTP_CONFIG.password || FTP_CONFIG.password.startsWith('__REEMPLAZAR')) {
    console.error('❌ Faltan credenciales FTP en .env (o el password sigue siendo placeholder)');
    process.exit(1);
  }

  if (process.argv.includes('--check')) {
    console.log('Modo --check: solo conexion y diagnostico (sin subir archivos)\n');
    const checkClient = new Client();
    checkClient.ftp.verbose = false;
    try {
      await checkClient.access(FTP_CONFIG);
      console.log('Conectado OK');
      console.log('cwd inicial:', await checkClient.pwd());

      if (FTP_REMOTE_PATH && FTP_REMOTE_PATH !== '/') {
        try {
          await checkClient.cd(FTP_REMOTE_PATH);
          console.log('cwd tras cd:', await checkClient.pwd());
        } catch (e) {
          console.log(`cd absoluto fallo (${e.message}), probando relativo...`);
          try {
            const rel = FTP_REMOTE_PATH.startsWith('/') ? FTP_REMOTE_PATH.slice(1) : FTP_REMOTE_PATH;
            await checkClient.cd(rel);
            console.log('cwd tras cd relativo:', await checkClient.pwd());
          } catch (e2) {
            console.log('cd relativo tambien fallo:', e2.message);
          }
        }
      }

      const list = await checkClient.list();
      console.log(`\nElementos en destino: ${list.length}`);
      list.slice(0, 25).forEach(f => {
        console.log('  ', f.type === 2 ? '[DIR] ' : '     ', f.name, f.type !== 2 ? `(${f.size} B)` : '');
      });
      if (list.length > 25) console.log(`  ... y ${list.length - 25} mas`);

      console.log('\n✓ Diagnostico completado');
    } catch (e) {
      console.error('✗ Error de conexion:', e.message);
      if (e.code) console.error('  Codigo:', e.code);
      process.exitCode = 1;
    } finally {
      checkClient.close();
    }
    return;
  }

  const files = await collectFiles();
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  console.log(`📁 Archivos: ${files.length}`);
  console.log(`📦 Tamaño: ${formatSize(totalSize)}\n`);

  const client = new Client();
  client.ftp.verbose = false;

  try {
    console.log('🔌 Conectando...');
    await client.access(FTP_CONFIG);
    console.log('✅ Conectado!');
    console.log(`📂 cwd real: ${await client.pwd()}\n`);

    if (FTP_REMOTE_PATH && FTP_REMOTE_PATH !== '/') {
      try {
        await client.cd(FTP_REMOTE_PATH);
        console.log(`📂 cwd: ${FTP_REMOTE_PATH}\n`);
      } catch (e) {
        console.error(`❌ No se pudo hacer cd a ${FTP_REMOTE_PATH}: ${e.message}`);
        process.exit(1);
      }
    }

    // Obtener directorios únicos y ordenarlos
    const dirs = [...new Set(files.map(f => {
      const parts = f.remote.split('/');
      parts.pop();
      return parts.join('/');
    }).filter(Boolean))].sort();

    // Crear directorios primero (relativos a FTP_REMOTE_PATH)
    for (const dir of dirs) {
      try {
        await client.cd(FTP_REMOTE_PATH);
        await client.ensureDir(dir);
        console.log(`📂 Creado: ${dir}`);
      } catch (e) {
        console.log(`⚠️  No se pudo crear ${dir}: ${e.message}`);
      }
    }

    // Volver a FTP_REMOTE_PATH
    await client.cd(FTP_REMOTE_PATH);

    console.log('\n📤 Subiendo archivos...\n');

    let uploaded = 0;
    let errors = 0;

    for (const file of files) {
      uploaded++;
      try {
        // Asegurarse de estar en el directorio correcto (relativo a FTP_REMOTE_PATH)
        const dir = file.remote.split('/').slice(0, -1).join('/');
        const fileName = file.remote.split('/').pop();

        await client.cd(FTP_REMOTE_PATH);
        if (dir) {
          await client.cd(dir);
        }

        await client.uploadFrom(file.local, fileName);
        console.log(`[${uploaded}/${files.length}] ✅ ${file.remote}`);
      } catch (e) {
        console.log(`[${uploaded}/${files.length}] ❌ ${file.remote}: ${e.message}`);
        errors++;
      }
    }

    console.log('\n' + '═'.repeat(50));
    if (errors === 0) {
      console.log('✅ DEPLOY COMPLETADO!');
    } else {
      console.log(`⚠️  Deploy completado con ${errors} errores`);
    }
    console.log('🌐 URL: https://oraculo.movimientofuncional.app');
    console.log('═'.repeat(50) + '\n');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    client.close();
  }
}

deploy();
