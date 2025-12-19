# Documentation Templates

## User Story Template (Gherkin Format)

### Basic Structure
```gherkin
Funcionalidad: [Nombre claro de la funcionalidad]

Escenario: [Descripción del escenario principal]
  Given [Contexto inicial/precondiciones]
  And [Contexto adicional si es necesario]
  When [Acción del usuario o evento disparador]
  And [Acciones adicionales si es necesario]
  Then [Resultado esperado]
  And [Resultados/validaciones adicionales]

Escenario: [Escenario alternativo/caso límite]
  Given [Contexto inicial diferente]
  When [Acción diferente]
  Then [Resultado esperado diferente]
```

### Complete Example (Fitness Platform)
```gherkin
Funcionalidad: Registro de entrenamientos diarios

Escenario: Usuario registra un entrenamiento completo
  Given que el usuario está autenticado en la plataforma
  And tiene una sesión activa en el dashboard
  When el usuario accede al formulario de registro de entrenamientos
  And selecciona el tipo de entrenamiento "Funcional"
  And completa los campos requeridos (duración: 45min, intensidad: Alta)
  And envía el formulario
  Then el sistema almacena el entrenamiento con fecha actual
  And el usuario recibe confirmación "Entrenamiento registrado correctamente"
  And el entrenamiento aparece en el historial de la semana

Escenario: Usuario intenta registrar entrenamiento sin autenticación
  Given que el usuario no está autenticado
  When el usuario intenta acceder al formulario de registro
  Then el sistema redirige a la página de login
  And muestra el mensaje "Debes iniciar sesión para registrar entrenamientos"

Escenario: Validación de datos de entrenamiento
  Given que el usuario está en el formulario de registro
  When el usuario intenta enviar el formulario sin completar campos obligatorios
  Then el sistema muestra mensajes de error específicos por cada campo faltante
  And no permite el envío hasta que todos los campos estén completos
```

### Scenario Types to Include
1. **Primary Path** - Happy path for typical user flow
2. **Alternative Paths** - Valid variations in user behavior
3. **Edge Cases** - Boundary conditions (empty lists, maximum limits)
4. **Error Scenarios** - Invalid inputs, auth failures, permission issues

---

## API Documentation Template

### Endpoint Documentation
```markdown
## POST /api/workouts

Creates a new workout for the authenticated user.

### Authentication
Requires valid session cookie.

### Request Body
```json
{
  "name": "string (required)",
  "type": "string (required) - funcional|fuerza|cardio|movilidad",
  "duration": "number (required) - minutes",
  "exercises": [
    {
      "exerciseId": "string (required)",
      "sets": "number",
      "reps": "number",
      "weight": "number"
    }
  ]
}
```

### Response

#### Success (201 Created)
```json
{
  "id": "uuid",
  "name": "Morning Workout",
  "type": "funcional",
  "duration": 45,
  "exercises": [...],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid request body |
| 401 | Not authenticated |
| 403 | Not authorized |
| 500 | Internal server error |

### Example
```bash
curl -X POST https://api.example.com/api/workouts \
  -H "Content-Type: application/json" \
  -d '{"name": "Morning Workout", "type": "funcional", "duration": 45}'
```
```

---

## Component Documentation Template

```markdown
## WorkoutCard

Displays a workout summary card with stats and action buttons.

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| workout | Workout | Yes | - | Workout data to display |
| onEdit | (id: string) => void | No | - | Edit button callback |
| onDelete | (id: string) => void | No | - | Delete button callback |
| variant | 'default' \| 'compact' | No | 'default' | Card display style |

### Usage

```tsx
import { WorkoutCard } from '@/components/WorkoutCard'

// Basic usage
<WorkoutCard workout={workout} />

// With actions
<WorkoutCard
  workout={workout}
  onEdit={(id) => router.push(`/edit/${id}`)}
  onDelete={(id) => handleDelete(id)}
/>

// Compact variant
<WorkoutCard workout={workout} variant="compact" />
```

### Accessibility

- Uses semantic HTML (`<article>`, `<header>`)
- Action buttons have proper labels
- Keyboard navigable
- Focus indicators visible

### Styling

Uses Tailwind classes. Customize via:
- `className` prop for wrapper
- CSS variables for colors (follows design system)
```

---

## Function Documentation Template

```typescript
/**
 * Calculates the estimated 1RM (one-rep max) using Brzycki formula
 *
 * Formula: weight × (36 / (37 - reps))
 *
 * @param weight - Weight lifted in kg
 * @param reps - Number of repetitions performed (must be < 37)
 * @returns Estimated 1RM in kg, rounded to 1 decimal
 * @throws Error if reps >= 37 (formula becomes invalid)
 *
 * @example
 * // Calculate 1RM for 100kg lifted 5 times
 * const oneRepMax = calculateOneRepMax(100, 5)
 * console.log(oneRepMax) // 112.5
 *
 * @example
 * // Invalid input
 * calculateOneRepMax(100, 40) // throws Error
 *
 * @see https://en.wikipedia.org/wiki/One-repetition_maximum
 * @since 1.0.0
 */
export function calculateOneRepMax(weight: number, reps: number): number {
  if (reps >= 37) {
    throw new Error('Reps must be less than 37 for Brzycki formula')
  }
  return Math.round((weight * (36 / (37 - reps))) * 10) / 10
}
```

---

## Changelog Template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- New feature description

### Changed
- Updated feature description

### Deprecated
- Soon-to-be removed feature

### Removed
- Removed feature

### Fixed
- Bug fix description

### Security
- Security improvement

## [1.2.0] - 2024-01-15

### Added
- Dashboard page with user statistics (#123)
- Workout intensity calculator using Brzycki formula
- Export workouts to CSV functionality

### Changed
- Improved mobile navigation touch targets
- Updated color palette for better contrast

### Fixed
- Fixed hydration error in workout list component
- Resolved timezone issues in date display

## [1.1.0] - 2024-01-01
...
```

---

## README Section Templates

### Installation
```markdown
## Installation

### Prerequisites
- Node.js 18+
- npm or pnpm

### Setup

1. Clone the repository
```bash
git clone https://github.com/user/repo.git
cd repo
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

4. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)
```

### Project Structure
```markdown
## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── api/             # API routes
│   ├── dashboard/       # Dashboard pages
│   └── (auth)/          # Auth-related pages
├── components/          # React components
│   ├── ui/             # Base UI components
│   └── features/       # Feature-specific components
├── lib/                 # Utilities and helpers
│   ├── supabase/       # Supabase client config
│   └── utils/          # General utilities
├── types/              # TypeScript type definitions
└── styles/             # Global styles
```
```
