/**
 * Oráculo - Módulo de Ayuda
 * Guía interactiva para entender el flujo de trabajo de la aplicación
 */

import { getReflexionDelDia } from '../data/burkeman.js';
import { USAGE_MODES, showNotification } from '../app.js';

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

      <!-- NUEVO: Por dónde empezar -->
      ${renderStartGuide()}

      <!-- NUEVO: Formas de usar Oráculo -->
      ${renderUsageModes(data)}

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

      <!-- NUEVO: Cómo se conecta todo -->
      ${renderConnectionsDiagram()}

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

      <!-- Filosofía Manson -->
      <section class="help-section help-section--philosophy">
        <div class="help-philosophy">
          <div class="philosophy-header">
            <span class="material-symbols-outlined">local_fire_department</span>
            <h2>La Filosofía Manson</h2>
          </div>
          <p class="philosophy-intro">
            Ideas de Mark Manson para dejar de preocuparte por lo que no importa.
            La felicidad no es tener más, sino <strong>elegir mejor qué te importa</strong>.
          </p>

          <div class="philosophy-pillars">
            <div class="pillar">
              <div class="pillar-icon">
                <span class="material-symbols-outlined">explore</span>
              </div>
              <h3>Valores</h3>
              <p>Los buenos valores son realistas, constructivos y controlables. Los malos valores son emocionales, destructivos e incontrolables.</p>
            </div>

            <div class="pillar">
              <div class="pillar-icon">
                <span class="material-symbols-outlined">control_camera</span>
              </div>
              <h3>Control</h3>
              <p>Concéntrate en lo que puedes controlar: tu actitud, tus suposiciones, tu comportamiento. A la mierda lo demás.</p>
            </div>

            <div class="pillar">
              <div class="pillar-icon">
                <span class="material-symbols-outlined">person_raised_hand</span>
              </div>
              <h3>Responsabilidad</h3>
              <p>Solo porque algo no sea tu culpa no significa que no sea tu responsabilidad. Tú decides cómo respondes.</p>
            </div>

            <div class="pillar">
              <div class="pillar-icon">
                <span class="material-symbols-outlined">filter_alt</span>
              </div>
              <h3>Priorización</h3>
              <p>Solo puedes dar importancia a muy pocas cosas. Si todo te importa, acabas jodida.</p>
            </div>
          </div>

          <div class="philosophy-applied">
            <h3>Triángulo de la Felicidad:</h3>
            <ul>
              <li><strong>Libertad:</strong> Control sobre cómo empleas tu tiempo</li>
              <li><strong>Relaciones:</strong> La calidad de tus conexiones humanas</li>
              <li><strong>Salud:</strong> Base de todo lo demás - empieza por aquí</li>
            </ul>
          </div>

          <div class="philosophy-applied">
            <h3>Herramientas de Reflexión:</h3>
            <ul>
              <li><strong>Gratitud:</strong> Lista de cosas por las que estás agradecida</li>
              <li><strong>Lista "A la mierda":</strong> Lo que quieres dejar de importarte</li>
              <li><strong>Análisis de Control:</strong> Separar lo que puedes cambiar de lo que no</li>
            </ul>
          </div>

          <blockquote class="philosophy-quote">
            <p>"La felicidad no es algo que esté fuera de nosotros: es simplemente una elección, basada en lo que decidimos valorar."</p>
            <cite>— Mark Manson</cite>
          </blockquote>
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

      <!-- NUEVO: FAQ Conceptual -->
      ${renderConceptualFaq()}

      <!-- Solución de Problemas / FAQ -->
      <section class="help-section">
        <h2 class="help-section-title">
          <span class="material-symbols-outlined">build</span>
          Solución de Problemas
        </h2>

        <div class="faq-list">
          ${renderFaqCard('bolt', 'Atajos rápidos', `
            <p>Antes de complicarte, prueba estos atajos:</p>
            <ul>
              <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> — Forzar recarga (Windows/Linux)</li>
              <li><kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> — Forzar recarga (Mac)</li>
              <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd> — Ventana incógnito (Chrome/Edge)</li>
              <li><kbd>F12</kbd> — Abrir herramientas de desarrollo</li>
            </ul>
          `, 'Ctrl+Shift+R es tu mejor amigo cuando algo no funciona.')}

          ${renderFaqCard('cached', 'La app no se actualiza', `
            <p>Si la app se comporta de forma extraña, puede ser que el navegador tenga una versión antigua en caché.</p>
            <p><strong>Solución rápida:</strong> Pulsa <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd></p>
            <p><strong>Si no funciona:</strong></p>
            <ol>
              <li>Pulsa <kbd>F12</kbd> para abrir DevTools</li>
              <li>Ve a <strong>Application</strong> → <strong>Service Workers</strong></li>
              <li>Haz clic en <strong>Unregister</strong></li>
              <li>Luego: <strong>Storage</strong> → <strong>Clear site data</strong></li>
              <li>Recarga con <kbd>Ctrl+Shift+R</kbd></li>
            </ol>
          `, 'Si después de limpiar sigue sin funcionar, prueba en una ventana de incógnito.')}

          ${renderFaqCard('cloud_upload', 'Opciones de backup', `
            <p>Oráculo guarda tus datos solo en tu navegador. Sin backup, no hay recuperación.</p>
            <p><strong>Opción 1 - Manual:</strong> Configuración → Descargar backup</p>
            <p><strong>Opción 2 - Auto-backup:</strong> Configuración → Vincular carpeta (elige una carpeta de Dropbox/Drive)</p>
            <p><strong>Opción 3 - Nube manual:</strong> Descarga el JSON y súbelo a tu nube favorita</p>
          `, 'Lo más seguro: vincula una carpeta de Dropbox/Drive para auto-backup automático.')}

          ${renderFaqCard('sync_problem', 'Sincronización entre dispositivos', `
            <p>La sincronización es manual mediante exportar/importar archivos JSON.</p>
            <ol>
              <li><strong>Origen:</strong> Configuración → Descargar backup</li>
              <li><strong>Sube el archivo</strong> a tu nube</li>
              <li><strong>Destino:</strong> Descarga el archivo e impórtalo</li>
            </ol>
            <p><strong>Si falla:</strong> Pulsa <kbd>Ctrl+Shift+R</kbd> y vuelve a intentar</p>
          `, 'Haz backup frecuente. Los datos solo existen en TU navegador.')}

          ${renderFaqCard('warning', 'Perdí mis datos', `
            <p><strong>Sin backup = sin recuperación.</strong> Los datos viven SOLO en tu navegador.</p>
            <p><strong>Por qué desaparecen:</strong></p>
            <ul>
              <li>Limpiaste "datos de navegación" o "cookies"</li>
              <li>Usaste modo incógnito</li>
              <li>Cambiaste de navegador o dispositivo</li>
              <li>Usaste "Clear site data" sin exportar primero</li>
            </ul>
            <p><strong>Si tienes backup:</strong> Configuración → Importar backup</p>
            <p><strong>Si vinculaste carpeta:</strong> Busca archivos <code>oraculo-backup-*.json</code></p>
          `, 'La prevención es la única solución. Exporta regularmente.')}
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
 * Renderiza una FAQ card simple (pregunta arriba, respuesta abajo)
 */
const renderFaqCard = (icon, question, answer, tip = null) => {
  return `
    <article class="faq-card">
      <div class="faq-question">
        <span class="material-symbols-outlined">${icon}</span>
        <h3>${question}</h3>
      </div>
      <div class="faq-answer">
        ${answer}
        ${tip ? `
          <div class="help-card-tip">
            <span class="material-symbols-outlined">tips_and_updates</span>
            <p>${tip}</p>
          </div>
        ` : ''}
      </div>
    </article>
  `;
};

/**
 * NUEVO: Renderiza la guía de "Por dónde empezar"
 */
const renderStartGuide = () => {
  return `
    <section class="help-section help-section--start">
      <div class="start-guide">
        <div class="start-guide__header">
          <span class="material-symbols-outlined start-guide__icon">rocket_launch</span>
          <h2>¿Por Dónde Empezar?</h2>
        </div>

        <div class="start-guide__recommendation">
          <span class="start-guide__badge">
            <span class="material-symbols-outlined">tips_and_updates</span>
            Recomendado
          </span>
          <p>La reflexión previa te da claridad para todo lo demás.</p>
        </div>

        <div class="start-guide__phases">
          <!-- Fase 1: Reflexión -->
          <div class="start-phase start-phase--primary">
            <div class="start-phase__header">
              <span class="start-phase__number">1</span>
              <h3>Reflexión</h3>
              <span class="start-phase__hint">Empieza aquí</span>
            </div>
            <div class="start-phase__steps">
              <a href="#life-wheel" class="start-step" data-view="life-wheel">
                <span class="material-symbols-outlined">target</span>
                <div>
                  <strong>Rueda de la Vida</strong>
                  <span>Evalúa las 8 áreas de tu vida</span>
                </div>
              </a>
              <span class="start-step__arrow material-symbols-outlined">arrow_forward</span>
              <a href="#values" class="start-step" data-view="values">
                <span class="material-symbols-outlined">explore</span>
                <div>
                  <strong>Brújula de Valores</strong>
                  <span>Define qué te importa</span>
                </div>
              </a>
            </div>
          </div>

          <!-- Fase 2: Organización -->
          <div class="start-phase">
            <div class="start-phase__header">
              <span class="start-phase__number">2</span>
              <h3>Organización</h3>
            </div>
            <div class="start-phase__steps start-phase__steps--vertical">
              <a href="#projects" class="start-step start-step--compact" data-view="projects">
                <span class="material-symbols-outlined">folder_open</span>
                <span>Crea 1-2 proyectos alineados con tus valores</span>
              </a>
              <a href="#kanban" class="start-step start-step--compact" data-view="kanban">
                <span class="material-symbols-outlined">view_kanban</span>
                <span>Añade tareas a tus horizontes</span>
              </a>
              <a href="#daily-setup" class="start-step start-step--compact" data-view="daily-setup">
                <span class="material-symbols-outlined">wb_twilight</span>
                <span>Configura tu primer día</span>
              </a>
            </div>
          </div>
        </div>

        <p class="start-guide__note">
          <span class="material-symbols-outlined">info</span>
          Este es el camino recomendado, pero puedes empezar por cualquier sitio.
        </p>
      </div>
    </section>
  `;
};

/**
 * NUEVO: Renderiza las formas de usar Oráculo
 */
const renderUsageModes = (data) => {
  const currentMode = data?.settings?.usageMode || 'complete';

  return `
    <section class="help-section">
      <h2 class="help-section-title">
        <span class="material-symbols-outlined">tune</span>
        Formas de Usar Oráculo
      </h2>
      <p class="section-intro">
        No tienes que usar todo. Elige lo que te sirva según tus necesidades.
      </p>

      <div class="usage-modes-help-grid">
        ${Object.values(USAGE_MODES).map(mode => `
          <div class="usage-mode-help-card ${mode.id === currentMode ? 'usage-mode-help-card--active' : ''}" data-mode="${mode.id}">
            <div class="usage-mode-help-card__header">
              <span class="material-symbols-outlined usage-mode-help-card__icon">${mode.icon}</span>
              <h3>${mode.name}</h3>
              ${mode.id === currentMode ? '<span class="usage-mode-help-card__badge">Activo</span>' : ''}
            </div>
            <p class="usage-mode-help-card__desc">${mode.description}</p>
            <p class="usage-mode-help-card__ideal">
              <span class="material-symbols-outlined icon-sm">person</span>
              ${mode.idealFor}
            </p>
            <div class="usage-mode-help-card__includes">
              <strong>Incluye:</strong>
              <span>${mode.includes.join(', ')}</span>
            </div>
            ${mode.id !== currentMode ? `
              <button class="btn btn--secondary btn--sm usage-mode-activate" data-mode="${mode.id}">
                Usar este modo
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <p class="help-card-tip">
        <span class="material-symbols-outlined">tips_and_updates</span>
        <span>Puedes cambiar de modo en cualquier momento desde Configuración.</span>
      </p>
    </section>
  `;
};

/**
 * NUEVO: Renderiza el diagrama de conexiones
 */
const renderConnectionsDiagram = () => {
  return `
    <section class="help-section">
      <h2 class="help-section-title">
        <span class="material-symbols-outlined">hub</span>
        Cómo se Conecta Todo
      </h2>
      <p class="section-intro">
        Cada parte de Oráculo está diseñada para complementar las demás.
      </p>

      <div class="connections-diagram">
        <div class="connection-flow">
          <!-- Nivel 1: Reflexión -->
          <div class="connection-level connection-level--reflection">
            <div class="connection-node connection-node--primary" data-view="life-wheel">
              <span class="material-symbols-outlined">target</span>
              <span>Rueda de la Vida</span>
            </div>
            <div class="connection-arrow">
              <span class="material-symbols-outlined">south</span>
              <span class="connection-label">evalúa</span>
            </div>
            <div class="connection-node connection-node--primary" data-view="values">
              <span class="material-symbols-outlined">explore</span>
              <span>Valores</span>
            </div>
          </div>

          <!-- Nivel 2: Organización -->
          <div class="connection-level connection-level--organization">
            <div class="connection-arrow connection-arrow--down">
              <span class="material-symbols-outlined">south</span>
              <span class="connection-label">guían</span>
            </div>
            <div class="connection-nodes-row">
              <div class="connection-node" data-view="projects">
                <span class="material-symbols-outlined">folder_open</span>
                <span>Proyectos</span>
              </div>
              <div class="connection-node" data-view="habits">
                <span class="material-symbols-outlined">science</span>
                <span>Hábitos</span>
              </div>
            </div>
          </div>

          <!-- Nivel 3: Acción -->
          <div class="connection-level connection-level--action">
            <div class="connection-arrow connection-arrow--down">
              <span class="material-symbols-outlined">south</span>
              <span class="connection-label">organizan</span>
            </div>
            <div class="connection-nodes-row">
              <div class="connection-node" data-view="kanban">
                <span class="material-symbols-outlined">view_kanban</span>
                <span>Horizontes</span>
              </div>
              <div class="connection-node" data-view="calendar">
                <span class="material-symbols-outlined">calendar_month</span>
                <span>Calendario</span>
              </div>
            </div>
          </div>

          <!-- Nivel 4: Reflexión -->
          <div class="connection-level connection-level--review">
            <div class="connection-arrow connection-arrow--down">
              <span class="material-symbols-outlined">south</span>
              <span class="connection-label">registra</span>
            </div>
            <div class="connection-node" data-view="journal">
              <span class="material-symbols-outlined">auto_stories</span>
              <span>Diario</span>
            </div>
            <div class="connection-arrow connection-arrow--loop">
              <span class="material-symbols-outlined">redo</span>
              <span class="connection-label">reflexiona sobre</span>
            </div>
          </div>
        </div>

        <div class="connections-explanations">
          <div class="connection-explanation">
            <span class="material-symbols-outlined">lightbulb</span>
            <p><strong>Rueda → Valores:</strong> Evalúa dónde estás para decidir qué priorizar.</p>
          </div>
          <div class="connection-explanation">
            <span class="material-symbols-outlined">lightbulb</span>
            <p><strong>Valores → Proyectos:</strong> Alinea tus proyectos con lo que te importa.</p>
          </div>
          <div class="connection-explanation">
            <span class="material-symbols-outlined">lightbulb</span>
            <p><strong>Diario → Hábitos:</strong> Anota qué te ayuda y qué te dificulta cumplir tu hábito.</p>
          </div>
        </div>
      </div>
    </section>
  `;
};

/**
 * NUEVO: Renderiza el FAQ conceptual
 */
const renderConceptualFaq = () => {
  return `
    <section class="help-section">
      <h2 class="help-section-title">
        <span class="material-symbols-outlined">quiz</span>
        Preguntas sobre el Uso
      </h2>

      <div class="faq-list">
        ${renderFaqCard('apps', '¿Tengo que usar todo?', `
          <p><strong>No.</strong> Oráculo es modular. Puedes usar:</p>
          <ul>
            <li>Solo el <strong>Diario</strong> para reflexionar</li>
            <li>Solo <strong>Hábitos</strong> si ya tienes otra app de tareas</li>
            <li>Solo <strong>Rueda + Valores</strong> para claridad de vida</li>
          </ul>
          <p>Elige las partes que te sirvan. Puedes cambiar de modo en Configuración.</p>
        `, 'Menos es más. Empieza con poco y ve añadiendo.')}

        ${renderFaqCard('science', '¿Por qué solo 1 hábito activo?', `
          <p>Basado en la ciencia de "Hábitos Atómicos":</p>
          <ul>
            <li><strong>Foco:</strong> Un hábito tiene más probabilidad de consolidarse</li>
            <li><strong>Energía:</strong> Cambiar comportamientos requiere recursos mentales</li>
            <li><strong>Paciencia:</strong> No existen los "21 días mágicos" - cada hábito tiene su tiempo</li>
          </ul>
          <p>Cuando un hábito esté consolidado, "gradúalo" y empieza otro.</p>
        `, 'Mejor 1 hábito bien que 5 a medias.')}

        ${renderFaqCard('compare_arrows', '¿Qué hago primero, Valores o Rueda de la Vida?', `
          <p><strong>Rueda de la Vida primero</strong> (recomendado):</p>
          <ol>
            <li><strong>Rueda:</strong> Evalúa cómo estás en las 8 áreas de tu vida</li>
            <li><strong>Valores:</strong> Con esa información, define qué priorizas</li>
          </ol>
          <p>La Rueda te da contexto para decidir mejor tus valores.</p>
        `)}

        ${renderFaqCard('add_circle', '¿Puedo usar Oráculo junto a Todoist/Notion?', `
          <p><strong>¡Sí!</strong> Usa el modo "Complemento":</p>
          <ul>
            <li><strong>En Oráculo:</strong> Valores, Rueda de la Vida, Diario</li>
            <li><strong>En tu otra app:</strong> Gestión de tareas del día a día</li>
          </ul>
          <p>Oráculo aporta la reflexión y claridad que otras apps no tienen.</p>
        `, 'Oráculo es sobre priorizar, no sobre hacer más.')}

        ${renderFaqCard('event_repeat', '¿Cada cuánto hacer la Rueda de la Vida?', `
          <p><strong>Trimestral</strong> es lo recomendado:</p>
          <ul>
            <li>Suficiente tiempo para ver cambios</li>
            <li>Coincide con las revisiones trimestrales del diario</li>
            <li>Oráculo te recordará cuando toque</li>
          </ul>
          <p>También puedes hacerla cuando sientas que algo ha cambiado significativamente.</p>
        `)}

        ${renderFaqCard('edit_note', '¿Qué escribo en el Diario sobre hábitos?', `
          <p>El Diario complementa el laboratorio de hábitos:</p>
          <ul>
            <li><strong>Qué te ayuda:</strong> ¿Qué hace más fácil cumplir el hábito?</li>
            <li><strong>Qué te dificulta:</strong> ¿Qué obstáculos encuentras?</li>
            <li><strong>Ajustes:</strong> ¿Qué cambiarías del disparador o la recompensa?</li>
          </ul>
          <p>Usa el tipo "Registro de Incomodidad" para reflexiones sobre crecimiento.</p>
        `, 'La reflexión escrita acelera el cambio de hábitos.')}

        ${renderFaqCard('block', '¿Los límites son obligatorios?', `
          <p><strong>Sí, son parte de la filosofía.</strong></p>
          <p>Los límites de Oráculo (máx 3 proyectos, 1 hábito, 1-3 tareas/día) están basados en:</p>
          <ul>
            <li><strong>Burkeman:</strong> Aceptar que no puedes hacerlo todo</li>
            <li><strong>Ley de Parkinson:</strong> El trabajo se expande para llenar el tiempo disponible</li>
            <li><strong>Priorización real:</strong> Si todo cabe, no has priorizado</li>
          </ul>
          <p>"Para añadir algo nuevo, primero completa o suelta algo."</p>
        `, 'Los límites te obligan a elegir lo importante.')}
      </div>
    </section>
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

  // NUEVO: Botones de activar modo de uso
  document.querySelectorAll('.usage-mode-activate').forEach(btn => {
    btn.addEventListener('click', () => {
      const newMode = btn.dataset.mode;

      // Actualizar settings
      const currentSettings = data.settings || {};
      updateData('settings', {
        ...currentSettings,
        usageMode: newMode
      });

      // Notificar a app.js para actualizar el menú
      window.dispatchEvent(new CustomEvent('usage-mode-changed'));

      const modeName = USAGE_MODES[newMode]?.name || 'Sistema Completo';
      showNotification(`Modo cambiado: ${modeName}`, 'success');

      // Recargar la vista para actualizar los badges
      setTimeout(() => location.reload(), 500);
    });
  });
};
