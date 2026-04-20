# Google Calendar Sync (Read-Only) — Diseño

**Fecha:** 2026-04-20
**Estado:** Diseño aprobado, pendiente de writing-plans
**Autora del brief:** Elena (usuaria / product owner)

---

## 1. Objetivo

Permitir que Oráculo muestre los eventos del Google Calendar del usuario dentro de la vista semanal de calendario, con el único propósito de **evitar planificar tareas cuando ya hay un compromiso externo que requiere presencia** (reuniones, citas médicas, etc.).

> "Quiero saber qué eventos tengo para evitar planificar una tarea cuando tengo algo en la agenda que requiere mi presencia."
> — Elena

## 2. Principios del diseño

1. **Solo lectura.** Google Calendar es la fuente de verdad de los compromisos externos. Oráculo solo los visualiza.
2. **Capa de contexto, no de datos propios.** Los eventos de Google NO se guardan en localStorage — se consultan a la API cada vez que se renderiza una semana.
3. **Degradación graciosa.** Sin internet, sin token, sin permisos, Oráculo sigue funcionando igual que hoy.
4. **Coherencia filosófica Burkeman.** Google = compromisos con otros; Oráculo = intenciones propias. No se mezclan semánticamente.
5. **Simplicidad KISS.** Sin cache complejo, sin sync bidireccional, sin webhooks, sin intervalos periódicos.

## 3. Decisiones confirmadas con la usuaria

| Decisión | Opción elegida |
|----------|---------------|
| Dirección de sincronización | **Solo importar** (pull, read-only) |
| Calendarios sincronizados | **El usuario elige cuáles** (checkboxes en Settings) |
| Cuándo sincronizar | **Automático al abrir la app + al navegar entre semanas + botón refresh manual** |
| Rango de fechas | **Solo la semana visible** (nueva petición al navegar) |
| Plataformas | **Web, Extensión Chrome y Android (Capacitor)** desde día uno |
| Edición de eventos Google | **No** — click abre Google Calendar (nueva pestaña/app) |
| Branch de trabajo | **master directo** (sin feature branch) |

## 4. Arquitectura

### 4.1 Flujo de datos

```
┌────────────────────────────────────────────────────────────────┐
│ ONBOARDING (una vez, en Configuración)                          │
│                                                                 │
│ Usuario → [Conectar Google Calendar]                            │
│   → OAuth scope calendar.readonly (reutiliza infra de Drive)    │
│   → gcal-service.listUserCalendars()                            │
│   → Settings muestra lista con checkboxes                       │
│   → Usuario marca los que quiere ver                            │
│   → settings.gcal.enabledCalendars = [id1, id2, ...]            │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ RENDER DE LA SEMANA (cada entrada a /calendar o navegación)     │
│                                                                 │
│ calendar.js.render(data)                                        │
│   → pinta eventos Oráculo sincrónicamente                       │
│   → dispara gcal-service.getEventsInRange(lunes, domingo)       │
│     ↳ por cada calendarId habilitado:                           │
│         events.list(timeMin, timeMax, singleEvents=true)        │
│     ↳ concatena resultados, normaliza shape                     │
│   → inyecta eventos Google en el DOM con clase .event--google  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ NAVEGACIÓN DE SEMANA                                            │
│                                                                 │
│ Click "semana anterior/siguiente" → nueva petición API          │
│ Sin cache; la API es rápida (<300ms habitual)                   │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 Auth compartida con Drive

Los módulos existentes `js/gdrive/auth-web.js`, `auth-extension.js` y `auth-capacitor.js` se extienden para aceptar un parámetro `scopes`. Cada scope-set cachea su propio token:

- `drive.file` → token existente (intacto, no se altera).
- `calendar.readonly` → token nuevo, gestionado en paralelo.

Los tokens son independientes: revocar Calendar no afecta a Drive y viceversa.

### 4.3 No persistencia de eventos

Los eventos de Google **nunca se guardan en localStorage**. Esto elimina:
- Complejidad de invalidación de cache.
- Riesgo de mostrar datos obsoletos tras ediciones en Google.
- Necesidad de borrar datos al archivar cuaderno anual.
- Consideraciones de privacidad por persistencia prolongada.

El trade-off (una petición API por render) es asumible porque la API de Calendar es rápida y el usuario no navega entre semanas constantemente.

## 5. Archivos

### 5.1 Nuevos

```
js/gcal/
├── gcal-service.js      # Cliente API: connect(), listUserCalendars(), getEventsInRange()
├── gcal-settings.js     # UI del panel "Google Calendar" en Configuración
└── gcal-render.js       # Normaliza evento Google → shape Oráculo + HTML del chip
```

### 5.2 Modificados

| Archivo | Cambio |
|---------|--------|
| `js/gdrive/auth-web.js` | Aceptar `scopes` opcional en `signIn()`; cachear token por scope-set |
| `js/gdrive/auth-extension.js` | Igual: pasar `scopes` a `chrome.identity.getAuthToken` |
| `js/gdrive/auth-capacitor.js` | Igual: pasar `scopes` adicionales a `GoogleAuth.signIn` |
| `js/gdrive/config.js` | Añadir `CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'` |
| `js/modules/calendar.js` | `render()` orquesta también `gcal-service`; inyecta eventos Google al DOM |
| `js/modules/settings.js` | Nueva sección "Google Calendar" con toggle de conexión y checkboxes |
| `css/style.css` | Nuevas clases `.event--google`, `.event--google__source`, `.gcal-chip-status` |
| `extension/manifest.json` | Verificar que `https://www.googleapis.com/*` está en `host_permissions` (ya lo está para Drive) |

### 5.3 Shape normalizada del evento (salida de `gcal-render.js`)

```js
{
  id: 'gcal_<eventId>',           // prefijo para distinguir de eventos Oráculo
  source: 'google',               // flag de render
  calendarId: 'primary',
  calendarName: 'Personal',
  calendarColor: '#4285F4',       // del calendar origen
  name: 'Cita dentista',
  date: '2026-04-22',
  startTime: '10:30',             // HH:mm, null si es "todo el día"
  duration: 60,                   // minutos, null si todo el día
  allDay: false,
  location: 'Clínica X',
  notes: '',                      // del campo `description` de GCal
  htmlLink: 'https://calendar.google.com/event?eid=...',
  readOnly: true
}
```

Imita el shape de los eventos Oráculo para que el render no sepa de dónde viene cada evento, salvo por el flag `source` que controla estilos y comportamiento del click.

## 6. Persistencia en localStorage

Se añade al objeto `oraculoData`:

```js
settings: {
  // ... campos existentes ...
  gcal: {
    enabled: false,                 // conectado sí/no
    account: null,                  // email al que está conectado
    enabledCalendars: [],           // array de calendarId
    lastSyncAt: null,               // timestamp última petición exitosa
    lastSyncError: null             // string con último error (o null)
  }
}
```

La lista `enabledCalendars` es **local por dispositivo** (no se sincroniza vía Drive JSON). Decisión consciente: Elena usa distintos dispositivos para distintos contextos, tiene sentido que cada uno tenga su propia selección.

## 7. UX

### 7.1 Onboarding en Configuración

```
┌──────────────────────────────────────────────────────┐
│ 📅 Google Calendar                                    │
│ Visualiza tus citas de Google en Oráculo para evitar │
│ planificar tareas cuando ya tienes algo con otros.    │
│                                                       │
│ [ Conectar Google Calendar ]                          │
└──────────────────────────────────────────────────────┘
```

Tras conectar:

```
┌──────────────────────────────────────────────────────┐
│ 📅 Google Calendar     ● Conectado como elena@...    │
│                                                       │
│ Calendarios a mostrar:                                │
│   ☑ Personal (elena@gmail.com)                        │
│   ☑ Trabajo                                           │
│   ☐ Cumpleaños                                        │
│   ☐ Festivos de España                                │
│   ☑ Familia (compartido)                              │
│                                                       │
│ [ Desconectar ]                                       │
└──────────────────────────────────────────────────────┘
```

- Checkboxes **desmarcados por defecto** (opt-in explícito, evita ruido inicial).
- Cambios se persisten al toggle (sin botón Guardar), coherente con toggles Burkeman.
- Desconectar borra token y `settings.gcal` completo.

### 7.2 Vista semanal con eventos Google

Los eventos Google aparecen mezclados cronológicamente con los Oráculo, pero visualmente distintos:

- **Borde punteado** (en lugar de sólido).
- **Opacidad 0.85**.
- **Franja lateral** con el `calendarColor` del calendario origen.
- **Icono `calendar_month`** en esquina superior.
- **Etiqueta tenue** con el nombre del calendario.

Interacción:
- **Click** → abre `htmlLink` en nueva pestaña (web) o navegador nativo (Android/extensión).
- Sin drag, sin botón editar, sin botón eliminar.

### 7.3 Indicador de estado y refresh manual

En la cabecera de la vista calendario, junto a "Exportar .ics", aparece un chip de estado con acción:

- **OK:** `⟲ Sincronizado hace 2 min` — click refresca manualmente.
- **Cargando:** `⟲ Sincronizando…` (spinner, no clickable).
- **Error:** `⚠ No se pudo conectar con Google Calendar [Reintentar]` — click reintenta.

El chip es la única interfaz de refresh manual. El refresh automático ocurre en dos momentos:
1. Al entrar en la vista Calendario.
2. Al navegar a una semana distinta (anterior/siguiente).

El error no bloquea el resto de la vista.

### 7.4 Eventos todo el día

Se muestran como **banner superior** de la columna del día correspondiente, no en la rejilla horaria.

### 7.5 Eventos que cruzan días

Se dibujan solo en el día de inicio. La UI actual no soporta representación multi-día y forzarlo añadiría complejidad desproporcionada.

## 8. Manejo de errores

| Situación | Comportamiento |
|-----------|---------------|
| Sin internet | Render normal solo con eventos Oráculo; chip "Sin conexión"; sin popup |
| Token expirado | Intento silencioso con refresh; si falla → chip "Reconectar" |
| Permisos revocados (desde Google) | Mismo flujo que token expirado |
| API 403 quota / 429 rate limit | Retry con backoff exponencial, máximo 2 reintentos; luego chip error |
| Calendario borrado desde Google | Ignorar silenciosamente; si estaba en `enabledCalendars`, eliminarlo automáticamente |
| Evento con `start.date` (sin hora) | Se renderiza como banner del día (allDay = true) |
| Evento recurrente | Query con `singleEvents=true` → Google expande instancias, cero lógica RRULE en Oráculo |
| Evento que cruza días | Solo se dibuja en el día de inicio |

## 9. Seguridad y privacidad

- **Scope mínimo:** `calendar.readonly` (no se puede crear, modificar ni borrar eventos desde Oráculo aunque se quisiera).
- **Sin servidor intermedio:** el token vive solo en localStorage del dispositivo. Oráculo no tiene backend.
- **HTTPS:** todas las llamadas a `googleapis.com`.
- **OAuth Consent Screen:** hay que declarar el nuevo scope en Google Cloud Console. `calendar.readonly` es un scope *sensitive* (no *restricted*); puede requerir verificación si se superan 100 usuarios, pero no bloquea el desarrollo.
- **CSP en extensión Chrome:** `https://www.googleapis.com/*` ya está permitido (usado por Drive); solo verificar.

## 10. Testing manual

Checklist antes de dar por terminada la feature:

- [ ] Web: conectar, ver calendarios, marcar/desmarcar, ver eventos, navegar semanas, desconectar.
- [ ] Extensión Chrome: mismo flujo en side panel.
- [ ] Android: mismo flujo (requiere rebuild de AAB).
- [ ] Calendario vacío: render sin errores.
- [ ] Día con 8+ eventos: legible.
- [ ] Eventos "todo el día": banner superior.
- [ ] Sin internet: app sigue funcionando, chip de error.
- [ ] Token caducado: re-auth silencioso transparente.
- [ ] Permisos revocados en `myaccount.google.com/permissions`: la app detecta y pide reconectar.
- [ ] Click en evento Google: abre Google Calendar.
- [ ] Drive sync sigue funcionando igual (regresión).

## 11. Plan de implementación (alto nivel)

Se divide en **5 tandas pequeñas** — cada una testeable de forma aislada:

1. **Auth extendida con scopes.** Modificar los 3 módulos `auth-*.js` para aceptar `scopes` opcionales. Verificar que Drive sigue funcionando.
2. **Módulo `gcal-service.js`.** Implementar `connect()`, `listUserCalendars()`, `getEventsInRange()`. Probar desde consola.
3. **UI en Settings.** Sección "Google Calendar" con toggle y checkboxes; persistencia en `settings.gcal`.
4. **Render en `calendar.js`.** Fetch + inyección de eventos Google con clase `.event--google`; click → `htmlLink`.
5. **Pulido.** Chip de estado/refresh manual en cabecera, estados de error, sincronizar `dist/` y `dist-extension/`, probar en las 3 plataformas, bump de versión.

Cada tanda se commitea por separado en master, siguiendo la preferencia de la usuaria de trabajar sin feature branches. El writing-plans dará el detalle concreto de cada paso.

## 12. Out of scope (para iteraciones futuras, si llegan a ser necesarias)

- Sincronización bidireccional (Oráculo → Google).
- Edición de eventos Google desde Oráculo.
- Intervalo de refresco periódico mientras la app está abierta.
- Notificaciones nativas basadas en eventos Google.
- Caché de eventos en localStorage.
- Eventos multi-día renderizados correctamente en varios días.
- Integración con Volumen Fijo (descontar tiempo ocupado por GCal del slots dinámico).
- Marcar automáticamente eventos GCal como "Sincronía" (tiempo con otros) Burkeman.

Estas decisiones se revisitarán solo si el uso real de Elena revela que son necesarias.
