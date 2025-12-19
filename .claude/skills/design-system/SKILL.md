---
name: design-system-skill
description: Sistema de diseño completo de Movimiento Funcional con paleta de colores, tipografía, componentes y mejores prácticas para desarrollo web optimizado para audiencia 40+. Incluye jerarquía visual profesional, accesibilidad WCAG 2.1 AA y componentes implementados para aplicaciones interactivas.
---

# Movimiento Funcional - Design System

## Overview

Sistema de diseño profesional optimizado para aplicaciones de salud y fitness dirigidas a mujeres 40+. Incluye paleta de colores sincronizada con implementación CSS, componentes reutilizables, y guías de accesibilidad y usabilidad.

**Keywords**: design system, brand colors, typography, accessibility, WCAG, responsive design, UX patterns, fitness apps, health apps, visual hierarchy

## Sistema de Colores

### Paleta Principal - Variables CSS

#### TURQUESA - Color Principal de Marca (#00BEC8)
```css
--turquesa-100: #cdfffb;  /* Fondos claros, estados hover sutiles */
--turquesa-400: #18f8f6;  /* Estados activos, highlights */
--turquesa-600: #00bec8;  /* PRIMARY - botones, navegación, CTAs */
--turquesa-700: #088b96;  /* Hover de elementos primarios */
```

**Uso principal:**
- Botones principales y CTAs
- Navegación y enlaces
- Elementos interactivos importantes
- Badges y etiquetas de estado positivo

#### ROSA FUERTE - Acciones Críticas (#E11D48)
```css
--rosa-500: #e11d48;  /* Acciones críticas, advertencias */
--rosa-600: #e11d48;  /* Estados normales críticos */
--rosa-700: #be123c;  /* Hover de elementos críticos */
```

**Uso principal:**
- Botones de eliminación o acciones irreversibles
- Advertencias críticas
- Errores importantes
- Máximo 1-2 elementos críticos por página

#### DORADO/AMARILLO - Información Importante (#EAB308)
```css
--tulip-tree-400: #facc15;  /* Highlights, alertas suaves */
--tulip-tree-500: #eab308;  /* Información importante */
--tulip-tree-600: #ca8a04;  /* Hover de elementos informativos */
```

**Uso principal:**
- Información complementaria importante
- Alertas no críticas
- Tips y consejos destacados
- Badges informativos

#### VERDE - Éxito y Confirmaciones (#10B981)
```css
--color-success: #10b981;    /* Mensajes de éxito */
--color-success-light: #d1fae5;  /* Fondos de éxito */
--color-success-dark: #047857;   /* Bordes de éxito */
```

#### NARANJA - Advertencias (#F59E0B)
```css
--color-warning: #f59e0b;    /* Advertencias moderadas */
--color-warning-light: #fef3c7;  /* Fondos de advertencia */
--color-warning-dark: #d97706;   /* Bordes de advertencia */
```

#### ROJO - Errores (#EF4444)
```css
--color-error: #ef4444;      /* Mensajes de error */
--color-error-light: #fee2e2;    /* Fondos de error */
--color-error-dark: #dc2626;     /* Bordes de error */
```

#### GRIS - Sistema de Neutrales
```css
--gris-50: #f9fafb;    /* Fondos sutiles, separadores */
--gris-100: #f3f4f6;   /* Fondos de tarjetas */
--gris-200: #e5e7eb;   /* Bordes sutiles */
--gris-300: #d1d5db;   /* Bordes estándar */
--gris-400: #9ca3af;   /* Texto deshabilitado */
--gris-500: #6b7280;   /* Texto secundario */
--gris-600: #4b5563;   /* Texto terciario */
--gris-700: #374151;   /* Texto secundario fuerte */
--gris-800: #1f2937;   /* Texto principal */
--gris-900: #111827;   /* Texto muy oscuro */
```

### Jerarquía Visual Profesional

**Principio fundamental:** No todo compite por atención. Usa la jerarquía de colores para guiar naturalmente la atención del usuario.

#### Niveles de Importancia:

1. **CRÍTICO** (Rosa #E11D48)
   - Máximo 1-2 elementos por página
   - Acciones irreversibles, eliminaciones, advertencias graves
   - Ejemplo: "Eliminar cuenta", "Cancelar suscripción"

2. **IMPORTANTE** (Turquesa #00BEC8)
   - CTAs principales, navegación primaria
   - Acciones deseadas pero no destructivas
   - Ejemplo: "Comenzar entrenamiento", "Guardar progreso"

3. **ÚTIL** (Dorado #EAB308)
   - Información complementaria valiosa
   - Tips, consejos, datos adicionales
   - Ejemplo: "Consejo de técnica", "Dato nutricional"

4. **SECUNDARIO** (Gris #6B7280)
   - Contexto, información de soporte
   - Navegación secundaria, metadatos
   - Ejemplo: "Fecha de última sesión", "Ver historial"

#### Reglas de Aplicación:

✅ **Combinaciones Recomendadas:**
- Flujo natural: Crítico → Importante → Útil → Secundario
- Contraste equilibrado: Oscuro → Claro → Neutro
- Guía visual: Color intenso para llamar, sutil para informar

❌ **Combinaciones Prohibidas:**
- No mezclar Rosa crítico + Turquesa importante en el mismo bloque
- No usar más del 15% del contenido como crítico
- No igualar todos los elementos al mismo nivel

## Tipografía

### Fuentes del Sistema

```css
/* Fuente Display - Solo para H1, H2 */
--font-display: 'Righteous', Arial, sans-serif;

/* Fuente Sans-serif - Párrafos, subtítulos, botones */
--font-sans: 'ABeeZee', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Escala Tipográfica (Factor 1.25)

#### Móvil (Base 16px)
```css
:root {
  --font-size-base: 16px;
  --font-size-h3: 20px;
  --font-size-h2: 25px;
  --font-size-h1: 31px;
}
```

#### Escritorio (Base 18px)
```css
@media (min-width: 768px) {
  :root {
    --font-size-base: 18px;
    --font-size-h3: 23px;
    --font-size-h2: 28px;
    --font-size-h1: 35px;
  }
}
```

### Reglas de Tipografía

- **Alineación**: Siempre `text-align: left` para cuerpos de texto
- **Justificación**: ❌ NUNCA usar `text-align: justify`
- **Guiones**: `hyphens: none`
- **Tamaño mínimo móvil**: 16px (evita zoom automático en iOS)
- **Line-height**: 1.6 para texto de cuerpo, 1.2 para títulos

## Componentes del Sistema

### Botones

#### Botón Primary (Turquesa)
```css
.btn-primary {
  background: var(--turquesa-600);
  color: white;
  border: 2px solid var(--turquesa-700);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 250ms ease-out;
}

.btn-primary:hover {
  background: var(--turquesa-700);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 190, 200, 0.3);
}
```

#### Botón Critical (Rosa)
```css
.btn-critical {
  background: var(--rosa-600);
  color: white;
  border: 2px solid var(--rosa-700);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 250ms ease-out;
}

.btn-critical:hover {
  background: var(--rosa-700);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
}
```

#### Botón Secondary (Gris)
```css
.btn-secondary {
  background: white;
  color: var(--gris-700);
  border: 2px solid var(--gris-300);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 250ms ease-out;
}

.btn-secondary:hover {
  background: var(--gris-50);
  border-color: var(--gris-400);
}
```

### Títulos para Landing Pages

#### H2 Landing (Profesional y Sobrio)
```css
.landing-title {
  color: var(--gris-800);
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 3.5rem);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

/* Variante para fondos oscuros */
.landing-title.white {
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Variante con acento turquesa */
.landing-title.accent {
  color: var(--turquesa-600);
  text-shadow: 0 1px 2px rgba(0, 190, 200, 0.2);
}
```

### Cajas de Contenido

#### Tip-Box (Consejos Prácticos)
```css
.tip-box {
  background: linear-gradient(135deg, var(--turquesa-100) 0%, var(--turquesa-50) 100%);
  border-left: 4px solid var(--turquesa-600);
  padding: 20px;
  border-radius: 8px;
  margin: 16px 0;
}

.tip-box h4 {
  color: var(--turquesa-700);
  margin-bottom: 12px;
}

.tip-box::before {
  content: "💡 ";
  font-size: 1.5em;
}
```

#### Info-Box (Información Complementaria)
```css
.info-box-subtle {
  background: linear-gradient(135deg, var(--tulip-tree-50) 0%, #fffbeb 100%);
  border-left: 4px solid var(--tulip-tree-500);
  padding: 20px;
  border-radius: 8px;
  margin: 16px 0;
}

.info-box-subtle h4 {
  color: var(--tulip-tree-600);
  margin-bottom: 12px;
}

.info-box-subtle::before {
  content: "ℹ️ ";
  font-size: 1.5em;
}
```

### Tarjetas de Ejercicio

```css
.exercise-card {
  background: white;
  border: 1px solid var(--gris-200);
  border-radius: 12px;
  padding: 20px;
  transition: all 250ms ease-out;
}

.exercise-card:hover {
  border-color: var(--turquesa-400);
  box-shadow: 0 4px 12px rgba(0, 190, 200, 0.15);
  transform: translateY(-2px);
}

.exercise-card-title {
  color: var(--gris-800);
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.exercise-card-meta {
  color: var(--gris-500);
  font-size: 0.875rem;
}
```

## Accesibilidad y Usabilidad

### Zonas Táctiles (Ley de Fitts)

- **Tamaño mínimo**: 44×44px para elementos táctiles
- **Recomendado móvil**: 48×48px
- **Separación mínima**: 8px entre elementos interactivos

### Contraste WCAG 2.1 AA

- **Texto normal**: 4.5:1 mínimo
- **Texto grande (18pt+)**: 3:1 mínimo
- **Elementos gráficos**: 3:1 mínimo

### Principios de Accesibilidad

✅ **SIEMPRE:**
- Acompaña color con iconos o texto
- Proporciona estados hover y focus visibles
- Usa `aria-label` en botones con solo iconos
- Mantén contraste adecuado en todos los estados

❌ **NUNCA:**
- Uses solo color para transmitir información
- Crees elementos interactivos menores a 44×44px
- Olvides estados de focus para navegación por teclado

## Iconografía

### Material Icons de Google

**Configuración:**
```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

**Uso básico:**
```html
<span class="material-icons">home</span>
```

**Tamaños:**
```css
.material-icons.small { font-size: 18px; }
.material-icons.medium { font-size: 24px; }
.material-icons.large { font-size: 36px; }
.material-icons.xlarge { font-size: 48px; }
```

**Colores de contexto:**
```css
.icon-primary { color: var(--turquesa-600); }
.icon-success { color: var(--color-success); }
.icon-warning { color: var(--color-warning); }
.icon-error { color: var(--color-error); }
```

### Iconos Más Usados

| Contexto | Icono | Código |
|----------|-------|--------|
| Navegación | home | `<span class="material-icons">home</span>` |
| Acciones | add, edit, delete | `<span class="material-icons">add</span>` |
| Estados | check_circle, warning, error | `<span class="material-icons">check_circle</span>` |
| Formularios | search, visibility, send | `<span class="material-icons">search</span>` |

## Animaciones

### Duración por Dispositivo

| Dispositivo | Duración |
|-------------|----------|
| Móvil | 200-300ms |
| Tablet | 400-450ms |
| Escritorio | 150-200ms |

### Curvas de Animación (Easing)

```css
/* Elementos que APARECEN */
.fade-in {
  transition: opacity 300ms ease-out;
}

/* Elementos que DESAPARECEN */
.fade-out {
  transition: opacity 200ms ease-in;
}

/* Elementos que se MUEVEN */
.slide {
  transition: transform 250ms ease-in-out;
}

/* Cambios de ESTADO */
.state-change {
  transition: background-color 200ms linear;
}
```

### Coreografía

**Principios:**
- Evitar simultaneidad usando `animation-delay`
- Secuencia lógica que guíe la atención
- Movimientos naturales con trayectorias curvas

**Ejemplo:**
```css
.card-1 { animation-delay: 0ms; }
.card-2 { animation-delay: 100ms; }
.card-3 { animation-delay: 200ms; }
```

## Sistema de Espaciado

### Escala Base (8px)

```css
:root {
  --space-0: 0;
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 40px;
  --space-6: 48px;
  --space-8: 64px;
  --space-10: 80px;
}
```

**Uso:**
- Padding interno: `var(--space-2)` o `var(--space-3)`
- Margen entre secciones: `var(--space-4)` o `var(--space-5)`
- Espaciado generoso: `var(--space-6)` o `var(--space-8)`

## Responsive Design

### Breakpoints

```css
/* Mobile first */
:root { /* 320px+ */ }

/* Tablet */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1440px) { }
```

### Principios Mobile-First

1. Diseñar primero para móvil
2. Añadir complejidad progresivamente
3. Priorizar contenido esencial
4. Optimizar zonas táctiles para dedos

## Mejores Prácticas

### Para Diseñadores

1. **Usa el sistema de swatches**: Cada color tiene propósito definido
2. **Respeta la jerarquía visual**: No todo puede ser crítico
3. **Contraste primero**: Verifica WCAG 2.1 AA en todos los estados
4. **Diseña para dedos**: 48×48px mínimo en móvil

### Para Desarrolladores

1. **Variables CSS siempre**: No uses valores hardcodeados
2. **Mobile-first approach**: CSS base para móvil, media queries para ampliar
3. **Semantic HTML**: Usa elementos correctos (button, nav, main, etc.)
4. **Accesibilidad desde el inicio**: aria-labels, roles, focus states

### Consistencia del Sistema

✅ **Garantizado:**
- Documentación sincronizada con CSS real
- Una sola fuente de verdad (variables CSS)
- Componentes copy-paste listos
- Contraste WCAG verificado

## Aplicación en Proyectos

Este sistema está optimizado para:

- **Aplicaciones de fitness y salud**
- **Generadores de entrenamientos**
- **Apps de tracking y progreso**
- **Plataformas educativas online**
- **Audiencia 40+ que prioriza legibilidad**

### Ejemplo de Implementación

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <style>
    :root {
      --turquesa-600: #00bec8;
      --turquesa-700: #088b96;
      --gris-800: #1f2937;
      --space-2: 16px;
      --font-sans: 'ABeeZee', sans-serif;
    }

    body {
      font-family: var(--font-sans);
      color: var(--gris-800);
      padding: var(--space-2);
    }

    .btn-primary {
      background: var(--turquesa-600);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 250ms ease-out;
    }

    .btn-primary:hover {
      background: var(--turquesa-700);
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <button class="btn-primary">
    <span class="material-icons">fitness_center</span>
    Comenzar Entrenamiento
  </button>
</body>
</html>
```

## Verificación de Implementación con Playwright MCP

### IMPORTANTE: Comprueba Tu Trabajo

**Después de implementar cambios de diseño, DEBES verificar visualmente usando Playwright MCP.**

#### Herramientas MCP Disponibles:

1. **mcp__playwright__browser_navigate**
   - Navega a la página donde hiciste cambios
   - Ejemplo: `http://localhost:3000/dashboard/calendar`

2. **mcp__playwright__browser_snapshot**
   - Captura snapshot de accesibilidad del estado actual
   - Verifica que los elementos estén correctamente estructurados
   - **USA ESTO en lugar de screenshot** para ver estructura de componentes

3. **mcp__playwright__browser_take_screenshot**
   - Captura screenshot visual de la página
   - Usa `fullPage: true` para ver todo el contenido
   - Guarda en archivo para comparar antes/después

4. **mcp__playwright__browser_click**
   - Prueba interacciones (botones, modales)
   - Verifica estados hover, focus, active

5. **mcp__playwright__browser_resize**
   - Prueba responsive design
   - Mobile: 375×667, Tablet: 768×1024, Desktop: 1440×900

#### Workflow Recomendado:

```typescript
// 1. Navega a la página
await browser_navigate({ url: "http://localhost:3000/ruta" })

// 2. Captura snapshot para ver estructura
await browser_snapshot()

// 3. Captura screenshot visual
await browser_take_screenshot({
  fullPage: true,
  filename: "after-changes.png"
})

// 4. Prueba responsive (si aplica)
await browser_resize({ width: 375, height: 667 })
await browser_take_screenshot({ filename: "mobile-view.png" })

// 5. Prueba interacciones (si aplica)
await browser_click({ element: "Botón Primary", ref: "..." })
await browser_snapshot() // Ver estado después del clic
```

#### Checklist de Verificación:

✅ **Colores:**
- [ ] Usa variables CSS (`var(--turquesa-600)`)
- [ ] No hay colores hardcodeados
- [ ] Contraste WCAG 2.1 AA cumplido

✅ **Iconografía:**
- [ ] Material Icons (NO emojis)
- [ ] Importación correcta: `import { MaterialIcon } from '@/components/MaterialIcon'`

✅ **Responsive:**
- [ ] Mobile (375px): texto legible, botones táctiles
- [ ] Tablet (768px): layout ajustado
- [ ] Desktop (1440px): uso eficiente del espacio

✅ **Accesibilidad:**
- [ ] Botones mínimo 44×44px
- [ ] Estados hover/focus visibles
- [ ] `aria-label` en iconos sin texto

✅ **Consistencia:**
- [ ] Sigue modal pattern si aplica
- [ ] Spacing coherente (escala 8px)
- [ ] Tipografía correcta (Righteous/ABeeZee)

### Ejemplo de Verificación Completa:

```typescript
// Después de modificar un modal
await browser_navigate({ url: "http://localhost:3000/dashboard" })
await browser_click({ element: "Abrir Modal", ref: "button" })
await browser_snapshot() // Verificar estructura del modal
await browser_take_screenshot({ filename: "modal-implementado.png" })

// Verificar colores inspeccionando el snapshot:
// - Borde del modal debe ser turquesa-500
// - Header con borde turquesa-200
// - Botón primary rosa-600
```

**NO OMITAS ESTE PASO.** Es tu responsabilidad verificar que la implementación cumple con el design system.

## Recursos Adicionales

- **Material Icons**: [fonts.google.com/icons](https://fonts.google.com/icons)
- **WCAG Guidelines**: [w3.org/WAI/WCAG21/quickref](https://w3.org/WAI/WCAG21/quickref/)
- **Contrast Checker**: [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/)
- **Playwright MCP Docs**: Incluido en tu configuración Claude Code

---

**Versión del Sistema:** 3.1
**Última actualización:** Octubre 2025
**Optimizado para:** Audiencia 40+ • Profesionales de salud • Aplicaciones interactivas • Sistema visual completo • Verificación automática con Playwright
