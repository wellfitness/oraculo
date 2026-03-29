/**
 * Oráculo - Módulo Changelog
 * Muestra el historial de versiones y novedades de la app.
 */

import { CHANGELOG, LATEST_VERSION } from '../data/changelog.js';

const TYPE_LABELS = {
  new: { icon: 'add_circle', label: 'Nuevo', cls: 'changelog-tag--new' },
  improve: { icon: 'trending_up', label: 'Mejora', cls: 'changelog-tag--improve' },
  fix: { icon: 'build', label: 'Corrección', cls: 'changelog-tag--fix' }
};

/**
 * Formatea fecha ISO a formato legible
 */
const formatDate = (isoDate) => {
  const [y, m, d] = isoDate.split('-');
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${parseInt(d)} de ${months[parseInt(m) - 1]} ${y}`;
};

/**
 * Renderiza una entrada del changelog
 */
const renderEntry = (entry, isLatest) => {
  const changesHtml = entry.changes.map(c => {
    const t = TYPE_LABELS[c.type];
    return `
      <li class="changelog-change">
        <span class="changelog-tag ${t.cls}">
          <span class="material-symbols-outlined">${t.icon}</span>
          ${t.label}
        </span>
        <span class="changelog-change-text">${c.text}</span>
      </li>`;
  }).join('');

  return `
    <article class="changelog-entry${isLatest ? ' changelog-entry--latest' : ''}">
      <header class="changelog-entry-header">
        <div class="changelog-version-row">
          <h2 class="changelog-version">v${entry.version}</h2>
          ${isLatest ? '<span class="changelog-badge-latest">Actual</span>' : ''}
        </div>
        <time class="changelog-date" datetime="${entry.date}">${formatDate(entry.date)}</time>
        <p class="changelog-title">${entry.title}</p>
      </header>
      <ul class="changelog-changes">
        ${changesHtml}
      </ul>
    </article>`;
};

/**
 * Renderiza la página de changelog
 */
export const render = () => {
  const entries = CHANGELOG.map((entry, i) => renderEntry(entry, i === 0)).join('');

  return `
    <div class="changelog-page">
      <header class="page-header">
        <h1 class="page-title">
          <span class="material-symbols-outlined icon-lg">update</span>
          Novedades
        </h1>
        <p class="page-description">
          Todas las mejoras y nuevas funciones de Oráculo.
        </p>
      </header>

      <div class="changelog-timeline">
        ${entries}
      </div>
    </div>`;
};

/**
 * Inicializa el módulo — marca la última versión como vista
 */
export const init = () => {
  try {
    localStorage.setItem('oraculo_changelog_seen', LATEST_VERSION);
  } catch (e) {
    // localStorage lleno — no crítico
  }
};

/**
 * Comprueba si hay novedades sin ver (exportado para uso desde el footer)
 */
export const hasUnseenChanges = () => {
  try {
    const seen = localStorage.getItem('oraculo_changelog_seen');
    return seen !== LATEST_VERSION;
  } catch (e) {
    return false;
  }
};
