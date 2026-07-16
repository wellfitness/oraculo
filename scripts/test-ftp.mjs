import { Client } from 'basic-ftp';
import { config } from 'dotenv';

config();

const client = new Client();
client.ftp.verbose = false;

const cfg = {
  host: process.env.FTP_HOST,
  port: parseInt(process.env.FTP_PORT || '21', 10),
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  secure: (process.env.FTP_SECURE || 'false').toLowerCase() === 'true'
};

console.log('Probando conexion a:', cfg.host + ':' + cfg.port);
console.log('Usuario:', cfg.user);

const variantes = [
  { user: cfg.user, secure: false },
  { user: cfg.user.replace(/\.oraculo\.movimientofuncional\.app$/, ''), secure: false },
  { user: cfg.user.split('.')[0], secure: false },
  { user: cfg.user, secure: true }
];
const probados = new Set();

for (const v of variantes) {
  const k = v.user + '|secure=' + v.secure;
  if (probados.has(k)) continue;
  probados.add(k);
  console.log('\n--- Probando user:', v.user, 'secure:', v.secure, '---');
  const c = new Client();
  try {
    await c.access({ ...cfg, user: v.user, secure: v.secure });
    console.log('OK CON', v.user, 'secure=' + v.secure);
    console.log('cwd:', await c.pwd());
    c.close();
    break;
  } catch (e) {
    console.log('Falla:', e.message);
    c.close();
  }
}

try {
  await client.access(cfg);
  console.log('CONECTADO');

  const cwdInicial = await client.pwd();
  console.log('cwd inicial:', cwdInicial);

  const FTP_REMOTE_PATH = process.env.FTP_REMOTE_PATH || '/';
  console.log('Intentando cd a:', FTP_REMOTE_PATH);

  try {
    await client.cd(FTP_REMOTE_PATH);
    const cwdFinal = await client.pwd();
    console.log('cd OK. cwd final:', cwdFinal);

    const list = await client.list();
    console.log('Archivos/carpetas en destino:', list.length);
    list.slice(0, 15).forEach(f => {
      const tipo = f.type === 2 ? '[DIR] ' : '[FILE]';
      console.log('  ' + tipo + ' ' + f.name + (f.type !== 2 ? ' (' + f.size + ' B)' : ''));
    });
    if (list.length > 15) console.log('  ... y ' + (list.length - 15) + ' mas');
  } catch (e) {
    console.error('Error en cd/ls:', e.message);
    console.log('Voy a intentar cd relativo al cwd inicial...');
    try {
      const relativePath = FTP_REMOTE_PATH.startsWith('/') ? FTP_REMOTE_PATH.slice(1) : FTP_REMOTE_PATH;
      await client.cd(relativePath);
      console.log('cd RELATIVO OK. cwd:', await client.pwd());
      const list = await client.list();
      console.log('Archivos:', list.length);
      list.slice(0, 15).forEach(f => console.log('  ' + f.name, f.type === 2 ? '[DIR]' : '[' + f.size + 'B]'));
    } catch (e2) {
      console.error('Tambien falla el cd relativo:', e2.message);
    }
  }
} catch (e) {
  console.error('ERROR de conexion:', e.message);
  if (e.code) console.error('Codigo:', e.code);
} finally {
  client.close();
  process.exit(0);
}
