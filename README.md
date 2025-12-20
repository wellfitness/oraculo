# Oráculo

> Sistema de gestión personal consciente para mujeres +40 que quieren organizarse para cuidarse.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Made with Vanilla JS](https://img.shields.io/badge/Made%20with-Vanilla%20JS-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

![Oráculo Screenshot](portada.webp)

## ¿Qué es Oráculo?

**Oráculo** es una aplicación web progresiva (PWA) que combina:

- **Filosofía Burkeman**: Aceptar la finitud, priorizar lo esencial ([4000 semanas](https://www.oliverburkeman.com/books))
- **Psicología conductista**: Crear hábitos de forma científica (Hábitos Atómicos)
- **Bullet Journal**: Sistema flexible de organización + cuadernos anuales
- **GTD humanizado**: Sin la presión de productividad tóxica

**Principio central**: No puedes hacerlo todo, y está bien. La herramienta ayuda a priorizar, no a hacer más.

## Demo

🔮 **[Probar Oráculo](https://oraculo.movimientofuncional.app)**

## Características

### Dashboard
- Foco del día con límite dinámico (1-3 tareas)
- Roca Principal: tu prioridad del día
- Citas de Burkeman rotativas
- Temporizador de calma (5 minutos)

### Brújula de Valores
- Define 3-5 valores personales
- Alineación de objetivos con valores

### Kanban por Horizontes
- **En Foco**: Tareas del día (máx 1-3)
- **Horizontes**: Trimestre, Mes, Semana
- **Backlog**: Captura sin límites
- Límites que respetan tu capacidad

### Laboratorio de Hábitos
- Un solo hábito activo a la vez
- Auditoría de hábitos (reflexión previa)
- Wizard de 7 pasos basado en Hábitos Atómicos
- Graduación de hábitos consolidados

### Calendario
- Vista semanal navegable
- Eventos puntuales y recurrentes
- Sincronía: tiempo con otros
- Exportación a .ics

### Diario Reflexivo
- Check-in diario y vespertino
- Revisiones semanales y trimestrales
- Registro de incomodidad (Burkeman)
- Escritura libre

### Logros
- Estadísticas por período
- Heatmap estilo GitHub
- Done List (logros espontáneos)
- Badges de hábitos graduados

### Cuadernos Anuales
- Archiva tu año como un Bullet Journal
- Exporta e importa datos en JSON
- Empieza limpio cada año

## Stack Técnico

```
HTML5 + CSS3 + JavaScript (vanilla ES6 modules)
Almacenamiento: localStorage
Iconos: Material Symbols Outlined
Sin backend, sin dependencias externas
PWA: Funciona offline
```

## Instalación

### Opción 1: Usar directamente

1. Clona el repositorio:
```bash
git clone https://github.com/wellfitness/oraculo.git
cd oraculo
```

2. Inicia un servidor local:
```bash
npm start
# o directamente:
npx http-server dist -p 8000
```

3. Abre en tu navegador: `http://localhost:8000`

### Opción 2: Desarrollo

```bash
# Instalar dependencias (solo para deploy)
npm install

# Servidor de desarrollo
npm start
```

> **Nota**: No abras los archivos HTML directamente con `file://` — causa errores CORS con ES modules.

## Estructura del Proyecto

```
oraculo/
├── index.html              # Landing page
├── app.html                # Aplicación principal (SPA)
├── css/
│   └── style.css           # Estilos con design system
├── js/
│   ├── app.js              # Coordinador principal y router
│   ├── storage.js          # Gestión de localStorage
│   ├── modules/            # Módulos de la aplicación
│   ├── components/         # Componentes reutilizables
│   └── data/               # Datos estáticos (citas, etc.)
├── dist/                   # Versión de producción
└── CLAUDE.md               # Documentación técnica detallada
```

## Contribuir

¡Las contribuciones son bienvenidas!

### Cómo contribuir

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Haz commit de tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guías de desarrollo

- Lee [CLAUDE.md](CLAUDE.md) para entender la arquitectura
- Usa vanilla JS, sin frameworks
- Mobile-first para CSS
- Accesibilidad WCAG 2.1 AA
- Iconos: Material Symbols Outlined

### Ideas para contribuir

- [ ] Tema oscuro
- [ ] Sincronización con calendario externo
- [ ] Notificaciones push
- [ ] Traducción a otros idiomas
- [ ] Tests automatizados

## Filosofía

Oráculo está diseñado con estas ideas en mente:

> "Solo tienes unas 4000 semanas. Elige bien."
> — Oliver Burkeman

> "No existe el '21 días mágicos'. Cada hábito tiene su tiempo."
> — James Clear

> "Para añadir algo nuevo, primero completa o suelta algo."
> — Principio de Oráculo

## Licencia

Este proyecto está bajo la licencia [CC BY-NC-SA 4.0](LICENSE) (Creative Commons Attribution-NonCommercial-ShareAlike).

Puedes usar, modificar y distribuir este software libremente, siempre que:
- **Atribución**: Des crédito apropiado a Movimiento Funcional
- **No Comercial**: No uses el material con fines comerciales
- **Compartir Igual**: Distribuyas tus contribuciones bajo la misma licencia

Para uso comercial, contacta: hola@movimientofuncional.com

## Créditos

Desarrollado por [Movimiento Funcional](https://movimientofuncional.com)

Inspirado en:
- [Oliver Burkeman](https://www.oliverburkeman.com/) - 4000 Semanas
- [James Clear](https://jamesclear.com/) - Hábitos Atómicos
- [Ryder Carroll](https://bulletjournal.com/) - Bullet Journal
- [David Allen](https://gettingthingsdone.com/) - GTD

---

<p align="center">
  <sub>Hecho con ❤️ para mujeres que quieren organizarse para cuidarse</sub>
</p>
