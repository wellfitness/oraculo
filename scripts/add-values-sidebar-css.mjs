/**
 * Script para añadir estilos CSS del sidebar de valores
 * Ejecutar: node scripts/add-values-sidebar-css.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const filePath = resolve('css/style.css');

// Leer el archivo
let content = readFileSync(filePath, 'utf-8');

// Normalizar line endings
content = content.replace(/\r\n/g, '\n');

// ============================================================
// CSS para el sidebar de valores
// ============================================================

const sidebarCSS = `
/* ==========================================================================
   VALORES - Layout 2 columnas con sidebar
   ========================================================================== */

/* Layout con sidebar */
.values-page--layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: var(--space-4);
  max-width: 1200px;
}

.values-sidebar {
  background: var(--gris-50);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  height: fit-content;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  position: sticky;
  top: var(--space-2);
  border: 1px solid var(--gris-200);
}

.values-main {
  min-width: 0;
}

/* Ocultar versión móvil en PC */
.values-page--layout .values-guide--mobile {
  display: none;
}

/* ==========================================================================
   VALORES - Sidebar de Guía (Mark Manson)
   ========================================================================== */

.values-guide-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.values-guide-sidebar__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-family-headings);
  font-size: var(--font-size-lg);
  color: var(--gris-800);
  margin: 0;
}

.values-guide-sidebar__title .material-symbols-outlined {
  color: var(--turquesa-600);
  font-size: 24px;
}

.values-guide-sidebar__quote {
  font-style: italic;
  color: var(--gris-600);
  font-size: var(--font-size-sm);
  line-height: 1.5;
  margin: 0;
  padding: var(--space-2);
  background: white;
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--turquesa-400);
}

.values-guide-sidebar__comparison {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.values-guide-sidebar__column {
  padding: var(--space-3);
  border-radius: var(--radius-md);
}

.values-guide-sidebar__column--good {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.values-guide-sidebar__column--bad {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.values-guide-sidebar__column h4 {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin: 0 0 var(--space-2) 0;
  color: var(--gris-800);
}

.values-guide-sidebar__column h4 .material-symbols-outlined {
  font-size: 18px;
}

.values-guide-sidebar__column--good h4 .material-symbols-outlined {
  color: var(--verde-600);
}

.values-guide-sidebar__column--bad h4 .material-symbols-outlined {
  color: var(--amarillo-600);
}

.values-guide-sidebar__column ul {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-2) 0;
  font-size: var(--font-size-sm);
}

.values-guide-sidebar__column li {
  padding: var(--space-1) 0;
  color: var(--gris-700);
  display: flex;
  align-items: flex-start;
  gap: var(--space-1);
}

.values-guide-sidebar__column li::before {
  content: '•';
  color: var(--gris-400);
  font-weight: bold;
}

.values-guide-sidebar__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.values-guide-sidebar__footer {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--gris-500);
  margin: 0;
  padding-top: var(--space-2);
  border-top: 1px solid var(--gris-200);
}

.values-guide-sidebar__footer .material-symbols-outlined {
  font-size: 14px;
  color: var(--turquesa-500);
}

/* ==========================================================================
   VALORES - Responsive
   ========================================================================== */

/* Tablet: sidebar arriba, comparación horizontal */
@media (max-width: 1024px) {
  .values-page--layout {
    grid-template-columns: 1fr;
    max-width: 800px;
  }

  .values-sidebar {
    position: static;
    max-height: none;
  }

  .values-guide-sidebar__comparison {
    flex-direction: row;
    gap: var(--space-3);
  }

  .values-guide-sidebar__column {
    flex: 1;
  }
}

/* Móvil: sidebar oculto, colapsable visible */
@media (max-width: 600px) {
  .values-sidebar {
    display: none;
  }

  .values-page--layout .values-guide--mobile {
    display: block;
  }
}

`;

// Buscar dónde insertar el CSS (después de .values-page { ... })
const insertPoint = `.values-page {
  max-width: 1000px;
  margin: 0 auto;
}`;

if (!content.includes('.values-page--layout')) {
  content = content.replace(insertPoint, insertPoint + sidebarCSS);
  console.log('✅ Estilos del sidebar de valores añadidos');
} else {
  console.log('⏭️ Estilos del sidebar ya existen');
}

// Guardar el archivo
writeFileSync(filePath, content, 'utf-8');
console.log('✅ Archivo CSS actualizado correctamente');
