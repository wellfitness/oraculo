/**
 * Script para añadir sidebar de Guía de Valores en values.js
 * Ejecutar: node scripts/update-values-sidebar.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const filePath = resolve('js/modules/values.js');

// Leer el archivo
let content = readFileSync(filePath, 'utf-8');

// Normalizar line endings
content = content.replace(/\r\n/g, '\n');

// ============================================================
// 1. Añadir renderValuesGuideSidebar() antes de renderValuesGuide()
// ============================================================

const sidebarFunction = `/**
 * Renderiza el sidebar con la guía de valores de Mark Manson (PC)
 */
const renderValuesGuideSidebar = () => {
  const buenos = getBuenosValores();
  const malos = getMalosValores();

  return \`
    <div class="values-guide-sidebar">
      <h2 class="values-guide-sidebar__title">
        <span class="material-symbols-outlined">help_outline</span>
        Buenos Valores
      </h2>
      <p class="values-guide-sidebar__quote">
        "Buenos valores te hacen mejor persona y no dependen de nada externo."
      </p>

      <div class="values-guide-sidebar__comparison">
        <div class="values-guide-sidebar__column values-guide-sidebar__column--good">
          <h4>
            <span class="material-symbols-outlined icon-success">check_circle</span>
            Buenos
          </h4>
          <ul>\${buenos.caracteristicas.map(c => \`<li>\${c}</li>\`).join('')}</ul>
          <div class="values-guide-sidebar__tags">
            \${buenos.ejemplos.slice(0, 4).map(e =>
              \`<span class="value-tag value-tag--good">\${e}</span>\`
            ).join('')}
          </div>
        </div>

        <div class="values-guide-sidebar__column values-guide-sidebar__column--bad">
          <h4>
            <span class="material-symbols-outlined icon-warning">warning</span>
            Malos
          </h4>
          <ul>\${malos.caracteristicas.map(c => \`<li>\${c}</li>\`).join('')}</ul>
          <div class="values-guide-sidebar__tags">
            \${malos.ejemplos.slice(0, 3).map(e =>
              \`<span class="value-tag value-tag--bad">\${e}</span>\`
            ).join('')}
          </div>
        </div>
      </div>

      <p class="values-guide-sidebar__footer">
        <span class="material-symbols-outlined icon-xs">auto_awesome</span>
        Mark Manson
      </p>
    </div>
  \`;
};

`;

// Buscar el comentario de renderValuesGuide para insertar antes
const insertPoint = '/**\n * Renderiza la guía de valores de Mark Manson';
if (!content.includes('renderValuesGuideSidebar')) {
  content = content.replace(insertPoint, sidebarFunction + insertPoint);
  console.log('✅ Añadida función renderValuesGuideSidebar()');
} else {
  console.log('⏭️ renderValuesGuideSidebar() ya existe');
}

// ============================================================
// 2. Modificar render() para layout de 2 columnas
// ============================================================

// Cambiar <div class="values-page"> a <div class="values-page values-page--layout">
// Y envolver en aside + main
const oldRenderStart = `return \`
    <div class="values-page">
      <header class="page-header">`;

const newRenderStart = `return \`
    <div class="values-page values-page--layout">
      <!-- Sidebar: Guía de Valores (solo PC) -->
      <aside class="values-sidebar">
        \${renderValuesGuideSidebar()}
      </aside>

      <!-- Contenido principal -->
      <main class="values-main">
        <header class="page-header">`;

if (content.includes(oldRenderStart)) {
  content = content.replace(oldRenderStart, newRenderStart);
  console.log('✅ Modificado inicio de render() con layout');
} else if (content.includes('<div class="values-page values-page--layout">')) {
  console.log('⏭️ Layout ya aplicado');
} else {
  console.log('⚠️ No se encontró el patrón de inicio de render()');
}

// Cerrar el </main> antes del cierre del modal
// Buscar el cierre del modal y añadir </main> antes
const oldModalSection = `      <!-- Modal para añadir/editar valor -->
      <dialog id="value-modal"`;

const newModalSection = `      </main>

      <!-- Modal para añadir/editar valor -->
      <dialog id="value-modal"`;

if (content.includes(oldModalSection) && !content.includes('</main>\n\n      <!-- Modal')) {
  content = content.replace(oldModalSection, newModalSection);
  console.log('✅ Añadido cierre de </main>');
} else {
  console.log('⏭️ Cierre de </main> ya existe o patrón no encontrado');
}

// ============================================================
// 3. Añadir clase --mobile a renderValuesGuide()
// ============================================================

const oldGuideSection = '<section class="values-guide">';
const newGuideSection = '<section class="values-guide values-guide--mobile">';

if (content.includes(oldGuideSection) && !content.includes('values-guide--mobile')) {
  content = content.replace(oldGuideSection, newGuideSection);
  console.log('✅ Añadida clase --mobile a renderValuesGuide()');
} else if (content.includes('values-guide--mobile')) {
  console.log('⏭️ Clase --mobile ya existe');
} else {
  console.log('⚠️ No se encontró <section class="values-guide">');
}

// ============================================================
// Guardar el archivo
// ============================================================

writeFileSync(filePath, content, 'utf-8');
console.log('\n✅ Archivo values.js actualizado correctamente');
