import { Client } from 'basic-ftp';
import { config } from 'dotenv';

config();

const c = new Client();
c.ftp.verbose = false;

try {
  await c.access({
    host: process.env.FTP_HOST,
    port: parseInt(process.env.FTP_PORT || '21', 10),
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    secure: false
  });

  console.log('Conectado. cwd inicial:', await c.pwd(), '\n');

  const paths = ['public_html', 'www', 'htdocs', 'web', 'html', 'domains', 'public', 'httpdocs', 'site'];
  for (const p of paths) {
    try {
      const list = await c.list(p);
      console.log(`[OK]   ${p}/  (${list.length} elementos)`);
      list.slice(0, 8).forEach(f => console.log('        ', f.type === 2 ? '[DIR] ' : '      ', f.name, f.type !== 2 ? `(${f.size} B)` : ''));
    } catch (e) {
      console.log(`[NO]   ${p}/  -> ${e.message.split('\n')[0]}`);
    }
  }

  console.log('\nListado completo de raiz (incluyendo ocultos):');
  try {
    const fullList = await c.list('/');
    fullList.forEach(f => console.log(' ', f.type === 2 ? '[DIR] ' : '      ', f.name, f.type !== 2 ? `(${f.size} B)` : ''));
  } catch (e) {
    console.log('Error al listar raiz:', e.message);
  }

  console.log('\nListado con -la:');
  try {
    const hiddenList = await c.list('/', true);
    hiddenList.forEach(f => console.log(' ', f.type === 2 ? '[DIR] ' : '      ', f.name, f.type !== 2 ? `(${f.size} B)` : ''));
  } catch (e) {
    console.log('Error al listar con ocultos:', e.message);
  }
} catch (e) {
  console.error('Error:', e.message);
} finally {
  c.close();
}
