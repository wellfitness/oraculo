# Patterns: Type Safety

## Rule: `@typescript-eslint/no-explicit-any`

**Risk Level:** MEDIUM
**Strategy:** Define interfaces, use `unknown` + type guards

---

## Pattern 1: Define Interfaces for Data

```typescript
// BAD
const data: any = await fetchData()

// GOOD
interface User {
  id: string
  email: string
  name: string
}
const data: User = await fetchData()
```

---

## Pattern 2: Use `unknown` + Type Guards

For truly dynamic data:

```typescript
// BAD
function process(input: any) {
  return input.value
}

// GOOD
interface InputData {
  value: string
}

function isInputData(value: unknown): value is InputData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof (value as InputData).value === 'string'
  )
}

function process(input: unknown) {
  if (isInputData(input)) {
    return input.value
  }
  throw new Error('Invalid input')
}
```

---

## Pattern 3: API Routes - Request Body

```typescript
// BAD
export async function POST(request: Request) {
  const body: any = await request.json()
}

// GOOD
interface CreateWorkoutRequest {
  name: string
  type: 'funcional' | 'fuerza' | 'cardio'
  duration: number
  userId: string
}

export async function POST(request: Request) {
  const body: CreateWorkoutRequest = await request.json()
}
```

---

## Pattern 4: API Routes - Response

```typescript
// BAD
export async function GET() {
  const data: any = await getData()
  return NextResponse.json(data)
}

// GOOD
interface WorkoutResponse {
  id: string
  name: string
  exercises: Exercise[]
}

export async function GET() {
  const data: WorkoutResponse = await getData()
  return NextResponse.json(data)
}
```

---

## Pattern 5: Supabase Queries

```typescript
// BAD
const { data, error }: any = await supabase
  .from('templates')
  .select('*')

// GOOD - Using Database types
import { Database } from '@/types/supabase'

type Template = Database['public']['Tables']['templates']['Row']

const { data, error } = await supabase
  .from('templates')
  .select<'*', Template>('*')

// ALTERNATIVE - Inline type
const { data, error } = await supabase
  .from('templates')
  .select('*')
  .returns<Template[]>()
```

---

## Pattern 6: Event Handlers

```typescript
// BAD
const handleChange = (e: any) => {
  setValue(e.target.value)
}

// GOOD
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value)
}

// Common event types:
// - React.ChangeEvent<HTMLInputElement>
// - React.ChangeEvent<HTMLSelectElement>
// - React.FormEvent<HTMLFormElement>
// - React.MouseEvent<HTMLButtonElement>
// - React.KeyboardEvent<HTMLInputElement>
```

---

## Pattern 7: Object with Dynamic Keys

```typescript
// BAD
const config: any = {}

// GOOD - Known keys
interface Config {
  apiUrl: string
  timeout: number
}
const config: Config = { apiUrl: '', timeout: 5000 }

// GOOD - Dynamic keys, known value type
const config: Record<string, number> = {}

// GOOD - Dynamic keys, unknown values
const config: Record<string, unknown> = {}
```

---

## Pattern 8: Function Parameters with Options

```typescript
// BAD
function setup(options: any) {
  // ...
}

// GOOD
interface SetupOptions {
  debug?: boolean
  timeout?: number
  onError?: (error: Error) => void
}

function setup(options: SetupOptions) {
  // ...
}
```

---

## Pattern 9: Array of Mixed Types

```typescript
// BAD
const items: any[] = []

// GOOD - If items are same type
const items: string[] = []

// GOOD - If items are union
const items: (string | number)[] = []

// GOOD - If truly unknown
const items: unknown[] = []
```

---

## Pattern 10: Third-party Library Returns

```typescript
// BAD - Library returns any
const result: any = externalLib.process()

// GOOD - Define expected shape
interface LibResult {
  success: boolean
  data: string
}
const result = externalLib.process() as LibResult

// ALTERNATIVE - If shape varies
const result: unknown = externalLib.process()
if (isExpectedShape(result)) {
  // use result
}
```

---

## When `eslint-disable` is Acceptable

```typescript
// ACCEPTABLE - Legacy system, impossible to type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyData: any = oldSystem.getData()
// NOTE: Legacy API returns dynamic structure

// ACCEPTABLE - Complex generic that TypeScript can't infer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComplexGeneric<T> = T extends any ? T : never
```

**Always add comment explaining WHY.**

---

## Project-Specific Types

This project uses:
- `Database` from `@/types/supabase` - Auto-generated Supabase types
- Common interfaces in `@/types/` directory
- Check existing types before creating new ones
