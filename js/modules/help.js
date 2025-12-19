/**
 * Oráculo - Módulo de Ayuda
 * Guía interactiva para entender el flujo de trabajo de la aplicación
 */

import { getReflexionDelDia } from '../data/burkeman.js';

/**
 * Renderiza la página de ayuda
 */
export const render = (data) => {
  const reflexion = getReflexionDelDia('dashboard');

  return `
    <div class="help-page">
      <header class="page-header">
        <h1 class="page-title">
          <span class="material-symbols-outlined icon-lg">help</span>
          Cómo usar Oráculo
        </h1>
        <p class="page-description">
          Tu guía para organizarte sin presión. Tómate tu tiempo para explorar.
        </p>
        <blockquote class="quote quote--header">
          <p>"${reflexion}"</p>
          <cite>— Oliver Burkeman</cite>
        </blockquote>
      </header>

      <!-- Flujo diario destacado -->
      <section class="help-section help-section--featured">
        <div class="help-card help-card--featured" data-card="flujo">
          <button class="help-card-header" aria-expanded="true" aria-controls="flujo-content">
            <div class="help-card-title">
              <span class="material-symbols-outlined icon-primary">routine</span>
              <h2>Tu Flujo Diario</h2>
            </div>
            <span class="material-symbols-outlined help-card-toggle">expand_more</span>
          </button>
          <div class="help-card-content" id="flujo-content">
            <ol class="help-steps">
              <li>
                <span class="step-icon material-symbols-outlined">bolt</span>
                <div class="step-content">
                  <strong>Setup del día</strong>
                  <p>Define tu tiempo disponible y nivel de energía. Esto calcula automáticamente cuántas tareas puedes abarcar (1-3).</p>
                </div>
              </li>
              <li>
                <span class="step-icon material-symbols-outlined">diamond</span>
                <div class="step-content">
                  <strong>Elige tu Roca Principal</strong>
                  <p>Una sola tarea que es tu prioridad máxima. Se hace PRIMERO, antes que nada.</p>
                </div>
              </li>
              <li>
                <span class="step-icon material-symbols-outlined">check_circle</span>
                <div class="step-content">
                  <strong>Trabaja en tus 1-3 tareas</strong>
                  <p>No más. Los límites te obligan a elegir lo que realmente importa.</p>
                </div>
              </li>
              <li>
                <span class="step-icon material-symbols-outlined">celebration</span>
                <div class="step-content">
                  <strong>Celebra logros</strong>
                  <p>Planificados o espontáneos. Usa el botón "+Logro" para capturar victorias inesperadas.</p>
                </div>
              </li>
              <li>
                <span class="step-icon material-symbols-outlined">auto_stories</span>
                <div class="step-content">
                  <strong>Reflexiona (opcional)</strong>
                  <p>El diario te ayuda a procesar el día. No es obligatorio, pero es poderoso.</p>
                </div>
              </li>
            </ol>
            <div class="help-card-tip">
              <span class="material-symbols-outlined">tips_and_updates</span>
              <p>No tienes que hacer todo. Solo lo que importa HOY.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Cards de secciones -->
      <section class="help-section">
        <h2 class="help-section-title">Las Secciones de Oráculo</h2>

        <div class="help-cards-grid">
          ${renderHelpCard('dashboard', 'home', 'Dashboard', 'Tu Centro de Control', `
            <p>Vista inicial con lo esencial del día. Aquí convergen todas las secciones.</p>
            <h4>Qué puedes hacer:</h4>
            <ul>
              <li>Ver y completar tus tareas del día</li>
              <li>Marcar tu hábito como completado</li>
              <li>Ver próximos eventos del calendario</li>
              <li>Añadir logros espontáneos (+Logro)</li>
              <li>Tomar 5 minutos de calma</li>
            </ul>
            <div class="help-relation">
              <span class="material-symbols-outlined">link</span>
              Aquí convergen: Kanban, Hábitos y Calendario
            </div>
          `, 'Empieza y termina tu día aquí. Es tu base de operaciones.')}

          ${renderHelpCard('values', 'explore', 'Brújula de Valores', 'Tu Norte Personal', `
            <p>Define 3-5 valores fundamentales que guían tus decisiones.</p>
            <h4>Para qué sirve:</h4>
            <ul>
              <li>Clarificar qué es importante para ti</li>
              <li>Conectar proyectos con tus valores</li>
              <li>Preguntarte: "¿Esto me acerca a mis valores?"</li>
            </ul>
            <div class="help-relation">
              <span class="material-symbols-outlined">link</span>
              Los valores conectan con: Proyectos
            </div>
          `, 'Los valores son tu norte. Revísalos cuando dudes qué priorizar.')}

          ${renderHelpCard('kanban', 'view_kanban', 'Horizontes', 'Tareas por Horizonte Temporal', `
            <p>Sistema de tareas organizadas por cuándo las harás.</p>
            <h4>Los 4 horizontes:</h4>
            <ul>
              <li><strong>Trimestre</strong> (máx 3): Objetivos grandes</li>
              <li><strong>Mes</strong> (máx 6): Hitos mensuales</li>
              <li><strong>Semana</strong> (máx 10): Lo de esta semana</li>
              <li><strong>Hoy / En Foco</strong> (1-3): Solo lo esencial</li>
            </ul>
            <p><strong>Backlog:</strong> Ideas sin presión (sin límite)</p>
            <div class="help-relation">
              <span class="material-symbols-outlined">link</span>
              Las tareas pueden pertenecer a: Proyectos (etiquetas de color)
            </div>
          `, 'Los límites son a propósito. Te obligan a elegir lo importante.')}

          ${renderHelpCard('projects', 'folder_open', 'Proyectos', 'Máximo 4 Proyectos Activos', `
            <p>Agrupa tareas relacionadas en proyectos con progreso automático.</p>
            <h4>Cómo funciona:</h4>
            <ul>
              <li>Vincula cada proyecto a un Valor (opcional)</li>
              <li>Asigna tareas del Kanban al proyecto</li>
              <li>El progreso se calcula automáticamente</li>
            </ul>
            <h4>Estados:</h4>
            <p>Activo → Pausado → Completado → Archivado</p>
            <div class="help-relation">
              <span class="material-symbols-outlined">link</span>
              Conecta con: Valores (alineación) y Kanban (tareas)
            </div>
          `, '4 proyectos máximo. Si quieres empezar uno nuevo, termina o pausa otro.')}

          ${renderHelpCard('habits', 'science', 'Laboratorio de Hábitos', 'Un Solo Hábito Activo', `
            <p>Sistema basado en "Hábitos Atómicos" de James Clear.</p>
            <h4>El sistema:</h4>
            <ul>
              <li><strong>Identidad:</strong> "Soy alguien que..."</li>
              <li><strong>Micro-hábito:</strong> Versión de 2 minutos</li>
              <li><strong>Disparador:</strong> "Después de X, hago Y"</li>
              <li><strong>4 leyes:</strong> Obvio, atractivo, fácil, satisfactorio</li>
            </ul>
            <h4>Racha y Graduación:</h4>
            <p>Cuando el hábito está consolidado, "gradúalo" → se convierte en badge permanente.</p>
          `, 'No existen los "21 días mágicos". Cada hábito tiene su tiempo.')}

          ${renderHelpCard('atelic', 'spa', 'Actividades de Ocio', 'Ocio SIN Objetivo', `
            <p>Actividades que haces por el placer de hacerlas, no por su resultado.</p>
            <h4>12 categorías:</h4>
            <p>Arte, música, lectura, naturaleza, movimiento, cocinar, jardinería, manualidades, juegos, socializar, contemplar, descansar.</p>
            <p>Registra estas actividades para recordarte que <strong>también está permitido simplemente SER</strong>.</p>
          `, 'El ocio es un fin en sí mismo, no un medio para ser más productiva.', false)}

          ${renderHelpCard('calendar', 'calendar_month', 'Calendario', 'Vista Semanal de Eventos', `
            <p>Organiza tu tiempo con eventos puntuales y recurrentes.</p>
            <h4>Funciones:</h4>
            <ul>
              <li><strong>Eventos puntuales:</strong> Fecha + hora + duración</li>
              <li><strong>Eventos recurrentes:</strong> Días de la semana</li>
              <li><strong>Sincronía:</strong> Marca "tiempo con otros"</li>
              <li><strong>Exportar:</strong> Genera archivo .ics para Google Calendar</li>
            </ul>
            <div class="help-relation">
              <span class="material-symbols-outlined">link</span>
              Los eventos de hoy aparecen en: Dashboard
            </div>
          `, 'La Sincronía reconoce que el tiempo compartido tiene valor especial.')}

          ${renderHelpCard('journal', 'auto_stories', 'Diario Reflexivo', '6 Tipos de Entrada', `
            <p>Espacio para procesar pensamientos con prompts guiados opcionales.</p>
            <h4>Tipos de entrada:</h4>
            <ul>
              <li><strong>Check-in diario:</strong> 4 prompts rápidos</li>
              <li><strong>Revisión semanal:</strong> 5 prompts sobre lo aprendido</li>
              <li><strong>Revisión trimestral:</strong> Alineación con valores</li>
              <li><strong>Registro de incomodidad:</strong> Crecimiento personal</li>
              <li><strong>Meditación:</strong> Post-práctica de calma</li>
              <li><strong>Escritura libre:</strong> Sin restricciones</li>
            </ul>
          `, 'Los prompts son opcionales. Lo importante es reflexionar, no seguir reglas.')}

          ${renderHelpCard('achievements', 'emoji_events', 'Logros', 'Tu Historial de Victorias', `
            <p>Visualiza y celebra todo lo que has conseguido.</p>
            <h4>Contenido:</h4>
            <ul>
              <li><strong>Estadísticas:</strong> Por semana, mes, trimestre o año</li>
              <li><strong>Heatmap:</strong> Actividad visual tipo GitHub</li>
              <li><strong>Recapitulación:</strong> Texto narrativo automático</li>
              <li><strong>Badges:</strong> Hábitos graduados permanentes</li>
              <li><strong>Done List:</strong> Logros no planificados</li>
            </ul>
          `, 'Celebra lo que lograste, no te castigues por lo que faltó.')}

          ${renderHelpCard('notebooks', 'menu_book', 'Cuadernos Anuales', 'Sistema Bullet Journal', `
            <p>Al terminar el año, archiva y empieza un cuaderno limpio.</p>
            <h4>Al archivar:</h4>
            <ul>
              <li>Descarga un JSON con todos los datos del año</li>
              <li><strong>Se MANTIENE:</strong> Valores, hábitos graduados, preferencias</li>
              <li><strong>Se LIMPIA:</strong> Tareas, diario, calendario, historial</li>
            </ul>
            <p>Puedes consultar años anteriores en modo lectura.</p>
          `, 'Cada año es un cuaderno nuevo. Empieza limpio, sin cargas del pasado.', false)}
        </div>
      </section>

      <!-- Filosofía Burkeman -->
      <section class="help-section help-section--philosophy">
        <div class="help-philosophy">
          <div class="philosophy-header">
            <span class="material-symbols-outlined">psychology</span>
            <h2>La Filosofía Burkeman</h2>
          </div>
          <p class="philosophy-intro">
            Oráculo está basado en las ideas de Oliver Burkeman sobre el tiempo y la productividad consciente.
            No se trata de hacer más, sino de <strong>elegir mejor</strong>.
          </p>

          <div class="philosophy-pillars">
            <div class="pillar">
              <div class="pillar-icon">
                <span class="material-symbols-outlined">hourglass_bottom</span>
              </div>
              <h3>Finitud</h3>
              <p>Solo tienes ~4000 semanas de vida. No puedes hacerlo todo, y está bien. Los límites de Oráculo te ayudan a aceptarlo.</p>
            </div>

            <div class="pillar">
              <div class="pillar-icon">
                <span class="material-symbols-outlined">trending_up</span>
              </div>
              <h3>Incomodidad</h3>
              <p>El crecimiento personal se siente incómodo. Si algo te cuesta, es señal de que estás avanzando.</p>
            </div>

            <div class="pillar">
              <div class="pillar-icon">
                <span class="material-symbols-outlined">help_outline</span>
              </div>
              <h3>Cuestionamiento</h3>
              <p>En lugar de buscar respuestas rápidas, vive las preguntas. El diario te ayuda a explorarlas.</p>
            </div>

            <div class="pillar">
              <div class="pillar-icon">
                <span class="material-symbols-outlined">public</span>
              </div>
              <h3>Insignificancia Cósmica</h3>
              <p>Suelta la presión de "dejar huella". No tienes que ganarte el derecho a existir siendo productiva.</p>
            </div>
          </div>

          <div class="philosophy-applied">
            <h3>Cómo se aplica en Oráculo:</h3>
            <ul>
              <li><strong>Límites en todo:</strong> No es un bug, es la filosofía</li>
              <li><strong>Volumen Fijo:</strong> Define tiempo y energía ANTES de elegir tareas</li>
              <li><strong>Roca Principal:</strong> Solo 1 prioridad máxima por día</li>
              <li><strong>Done List:</strong> Celebra lo no planificado</li>
              <li><strong>Reflexiones rotativas:</strong> Recordatorios diarios de lo que importa</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Tips rápidos -->
      <section class="help-section">
        <h2 class="help-section-title">Consejos Rápidos</h2>
        <div class="help-tips-grid">
          ${renderTip('tips_and_updates', 'Empieza con tus valores. Todo lo demás fluye desde ahí.')}
          ${renderTip('diamond', 'La Roca Principal se hace PRIMERO. Sin excusas ni distracciones.')}
          ${renderTip('local_fire_department', 'Un solo hábito activo. Cuando esté consolidado, gradúalo.')}
          ${renderTip('group', 'Marca "Sincronía" en eventos con personas que importan.')}
          ${renderTip('self_improvement', '5 minutos de calma pueden cambiar tu día. Úsalos.')}
          ${renderTip('celebration', 'Añade logros espontáneos. No todo lo bueno se planifica.')}
        </div>
      </section>

      <!-- Cierre -->
      <section class="help-section help-section--footer">
        <div class="help-footer-message">
          <span class="material-symbols-outlined">favorite</span>
          <p>
            <strong>Recuerda:</strong> Esta app es tu herramienta, no tu jefe.
            Adáptala a ti, no al revés.
          </p>
        </div>
      </section>
    </div>
  `;
};

/**
 * Renderiza una card de ayuda individual
 */
const renderHelpCard = (id, icon, title, subtitle, content, tip, hasNavLink = true) => {
  return `
    <div class="help-card" data-card="${id}">
      <button class="help-card-header" aria-expanded="false" aria-controls="${id}-content">
        <div class="help-card-title">
          <span class="material-symbols-outlined">${icon}</span>
          <div>
            <h3>${title}</h3>
            <span class="help-card-subtitle">${subtitle}</span>
          </div>
        </div>
        <span class="material-symbols-outlined help-card-toggle">expand_more</span>
      </button>
      <div class="help-card-content" id="${id}-content" hidden>
        ${content}
        ${tip ? `
          <div class="help-card-tip">
            <span class="material-symbols-outlined">tips_and_updates</span>
            <p>${tip}</p>
          </div>
        ` : ''}
        ${hasNavLink ? `
          <button class="help-nav-link btn btn--tertiary" data-view="${id}">
            <span class="material-symbols-outlined">arrow_forward</span>
            Ir a ${title}
          </button>
        ` : ''}
      </div>
    </div>
  `;
};

/**
 * Renderiza un tip rápido
 */
const renderTip = (icon, text) => {
  return `
    <div class="help-tip-item">
      <span class="material-symbols-outlined">${icon}</span>
      <p>${text}</p>
    </div>
  `;
};

/**
 * Inicializa los eventos de la página de ayuda
 */
export const init = (data, updateData) => {
  // Manejar cards expandibles
  document.querySelectorAll('.help-card-header').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.closest('.help-card');
      const content = card.querySelector('.help-card-content');
      const isExpanded = header.getAttribute('aria-expanded') === 'true';

      // Toggle estado
      header.setAttribute('aria-expanded', !isExpanded);
      content.hidden = isExpanded;

      // Animar icono de toggle
      const toggle = header.querySelector('.help-card-toggle');
      toggle.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    });
  });

  // Abrir la card destacada por defecto
  const featuredCard = document.querySelector('.help-card--featured');
  if (featuredCard) {
    const header = featuredCard.querySelector('.help-card-header');
    const content = featuredCard.querySelector('.help-card-content');
    header.setAttribute('aria-expanded', 'true');
    content.hidden = false;
    const toggle = header.querySelector('.help-card-toggle');
    toggle.style.transform = 'rotate(180deg)';
  }
};
