---
name: Movimiento Funcional & Odisea Antifrágil
colors:
  primary: "#006369"
  primary-action: "#00bec8"
  primary-hover: "#00484d"
  on-primary: "#ffffff"
  secondary: "#eab308"
  secondary-hover: "#ca8a04"
  on-secondary: "#111827"
  critical: "#e11d48"
  critical-hover: "#be123c"
  on-critical: "#ffffff"
  neutral: "#111827"
  surface: "#ffffff"
  surface-container: "#f3f4f6"
  surface-deep: "#f9fafb"
  text: "#1f2937"
  text-muted: "#6b7280"
  border: "#e5e7eb"
  border-active: "#d1d5db"
typography:
  headline-display:
    fontFamily: Righteous, Arial, sans-serif
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.15
  headline-lg:
    fontFamily: Righteous, Arial, sans-serif
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.2
  headline-md:
    fontFamily: Righteous, Arial, sans-serif
    fontSize: 22px
    fontWeight: 400
    lineHeight: 1.25
  body-lg:
    fontFamily: ABeeZee, sans-serif
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: ABeeZee, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  label-md:
    fontFamily: ABeeZee, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  xxl: 64px
rounded:
  none: 0px
  sm: 8px
  md: 12px
  lg: 16px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 12px 24px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-action:
    backgroundColor: "{colors.primary-action}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
    padding: 12px 24px
  button-critical:
    backgroundColor: "{colors.critical}"
    textColor: "{colors.on-critical}"
    rounded: "{rounded.sm}"
    padding: 12px 24px
  button-critical-hover:
    backgroundColor: "{colors.critical-hover}"
    textColor: "{colors.on-critical}"
  card-container:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 24px
  card-subtle:
    backgroundColor: "{colors.surface-deep}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 20px
  badge-tip:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: 12px 16px
---

## Overview

Sistema de diseño visual para **Movimiento Funcional** y **Odisea Antifrágil**, concebido específicamente para mujeres 40+ enfocadas en entrenamiento de fuerza, salud ósea, prevención activa de osteopenia y longevidad funcional.

El tono visual es riguroso, científico, sobrio y enérgico, alejado de la condescendencia pastel ("wellness genérico") y de la agresividad del fitness tradicional. La jerarquía se construye con tipografía rotunda, contrastes accesibles y solidez de capas sin degradados.

## Colors

La paleta cromática se articula en torno a tres acentos intencionales y un sistema de neutrales de alta legibilidad:

- **Turquesa Primario (`#006369` / `#00BEC8`):** Identidad insignia. Para texto y botones con texto blanco se utiliza el tono oscuro `#006369` (`--turquesa-800`), garantizando un ratio de contraste WCAG 2.1 AA de 5.36:1 (y `#00484d` en hover con 8.21:1). Los elementos destacados en turquesa vivo `#00BEC8` (`--turquesa-600`) usan texto oscuro neutro `#111827` (ratio 9.2:1).
- **Rosa Crítico (`#E11D48`):** Reservado estrictamente para acciones destructivas (eliminar, cancelar) y alertas graves. Máximo 1 elemento crítico por pantalla.
- **Dorado / Tulip Tree (`#EAB308`):** Indicador de valor, tips clínicos, recomendaciones técnicas y avisos informativos positivos.
- **Neutrales y Superficies (`#FFFFFF`, `#F9FAFB`, `#F3F4F6`, `#1F2937`, `#111827`):** Proporcionan descanso visual y ritmo de lectura nítido para vista cansada o presbicia.

## Typography

Estrategia tipográfica dual con jerarquía clara y sin artificios:

- **Display y Titulares (Righteous):** Fuente geométrica con carácter, reservada para encabezados `h1`, `h2` y números destacados de impacto. Nunca en cursiva ni en mayúsculas sostenidas en textos largos.
- **Cuerpo y UI (ABeeZee):** Diseñada para máxima legibilidad continua en pantallas. Siempre alineada a la izquierda (`text-align: left`). Prohibido justificar texto y prohibido el corte arbitrario con guiones (`hyphens: none`).
- **Escala de Tamaños:** Base de 16px en móvil y 18px en escritorio. Los campos de formulario usan mínimo 16px para evitar el zoom intrusivo en iOS Safari.

## Layout

Modelo mobile-first estricto con rejilla base de 8px:

- **Mobile First a 360px:** Diseñado para adaptarse con soltura desde 360px (móviles compactos Android / iPhone SE) hasta 430px (móviles estándar), 768px (tablets) y 1200px+ (escritorio).
- **Blindaje Anti-Scroll Horizontal:** Contenedores y wrappers principales deben limitar `max-width: 100vw; overflow-x: clip;` para impedir oscilaciones laterales accidentales en pantallas táctiles.
- **Zonas Táctiles (Ley de Fitts):** Mínimo interactivo de 44×44px (recomendado 48×48px en móvil) con separación mínima de 8px entre enlaces y botones.

## Elevation & Depth

La profundidad se genera mediante **Capas de Color Sólido (Color Layering)** y no mediante degradados o halos:

- **Capa 1 (Fondo base):** Superficie profunda (`#F9FAFB` o fondo oscuro de sección).
- **Capa 2 (Contenedor / Tarjeta):** Superficie blanca pura (`#FFFFFF`) o contenedor sutil (`#F3F4F6`).
- **Capa 3 (Interactivo):** Botones y elementos accionables con borde definido.
- **Sombras Físicas:** Sombras de dos capas neutras (`--shadow-two-layer-md`) que combinan una luz difusa superior con una sombra inferior de contacto, sin resplandores de color ni efectos neón.

## Shapes

Arquitectura sobria con esquinas suavemente redondeadas:

- **Contenedores y Tarjetas:** Radio de 12px (`rounded.md`) para equilibrio entre solidez y accesibilidad.
- **Botones e Inputs:** Radio de 8px (`rounded.sm`) para delimitar el área táctil sin perder contundencia.
- **Píldoras y Badges:** Radio completo (`rounded.full`) reservado exclusivamente para etiquetas de estado o metadatos breves.

## Components

- **Botón Primario:** Fondo `#006369`, borde `#00484D`, texto `#FFFFFF`, padding `12px 24px`, esquinas `8px`. Cumple WCAG AA (5.36:1).
- **Botón Acción Válida:** Fondo `#00BEC8`, texto `#111827`, padding `12px 24px`, esquinas `8px`. Cumple WCAG AA (9.2:1).
- **Botón Crítico:** Fondo `#E11D48`, borde `#BE123C`, texto `#FFFFFF`, padding `12px 24px`. Cumple WCAG AA (4.54:1).
- **Tarjetas de Ejercicio y Contenido:** Fondo blanco, borde `1px solid #E5E7EB`, padding de `20px` a `24px`.
- **Cajas de Tips:** Borde superior de acento (dorado `#EAB308` o turquesa `#006369`), fondo contenedor `#FFFFFF`, acompañadas de icono de Material Symbols con `aria-hidden="true"`.
- **Iconografía:** Uso exclusivo de Google Material Icons / Symbols vectoriales. Cero emojis en interfaces de usuario.

## Do's and Don'ts

- Do diseñar mobile-first garantizando legibilidad en 360px de viewport.
- Do utilizar `--turquesa-800` (`#006369`) o `--turquesa-900` para cualquier texto sobre fondo claro (WCAG AA compliant).
- Do alinear todo el cuerpo de texto a la izquierda (`text-align: left`).
- Don't usar degradados genéricos (`linear-gradient`) en fondos, tarjetas o botones.
- Don't insertar emojis en pseudo-elementos CSS o botones interactivos.
- Don't forzar `text-align: justify` ni centrar párrafos largos en móvil (evitar centritis).
- Don't usar `border-left` indiscriminado en tarjetas decorativas; reservarlo solo para alertas del sistema.
- Don't permitir scroll horizontal accidental en pantallas móviles.
