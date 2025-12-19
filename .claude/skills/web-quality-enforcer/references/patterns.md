# Code Patterns - Next.js, TypeScript, React

## TypeScript Standards

### ALWAYS Define Types
```typescript
// types/workout.ts
export interface Workout {
  id: string
  name: string
  exercises: Exercise[]
  createdAt: Date
  updatedAt: Date
}

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
}
```

### NEVER Use `any`
```typescript
// BAD
const data: any = await fetch()

// GOOD
interface ApiResponse {
  data: Workout[]
  total: number
}
const response: ApiResponse = await fetch()
```

### Proper Error Types
```typescript
// GOOD
try {
  await operation()
} catch (err) {
  if (err instanceof Error) {
    console.error('Error:', err.message)
  }
  throw err
}
```

---

## Next.js Patterns

### Server vs Client Components

**Default to Server Components**:
- Fetch data on server
- No client-side JavaScript
- Better performance

**Use Client Components only when**:
- Need interactivity (onClick, onChange)
- Use React hooks (useState, useEffect)
- Use browser APIs

### Data Fetching

**Server Component (Preferred)**:
```tsx
async function getData() {
  const res = await fetch('https://api.example.com/data', {
    cache: 'no-store' // or 'force-cache', or { revalidate: 60 }
  })
  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <div>{data.title}</div>
}
```

**Client Component (When Needed)**:
```tsx
'use client'

import useSWR from 'swr'

export function ClientComponent() {
  const { data, error } = useSWR('/api/data', fetcher)

  if (error) return <div>Error loading</div>
  if (!data) return <div>Loading...</div>

  return <div>{data.title}</div>
}
```

### Loading & Error States
```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <div>Loading dashboard...</div>
}

// app/dashboard/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Metadata
```tsx
// app/dashboard/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | My App',
  description: 'User dashboard with stats and activity',
}
```

---

## API Route Patterns

### Basic Structure
```tsx
// app/api/resource/route.ts
import { NextRequest, NextResponse } from 'next/server'

interface RequestBody {
  field1: string
  field2: number
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()

    // Validation
    if (!body.field1) {
      return NextResponse.json(
        { error: 'field1 is required' },
        { status: 400 }
      )
    }

    // Business logic
    const result = await processData(body)

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### With Authentication
```tsx
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Continue with authenticated request
}
```

### Dynamic Route Parameters
```tsx
// app/api/resource/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Use id...
}
```

---

## React Component Patterns

### Props Interface
```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}

export function Button({
  variant,
  size = 'md',
  disabled = false,
  children,
  onClick
}: ButtonProps) {
  // Implementation
}
```

### Conditional Rendering
```tsx
// GOOD - Early returns
function Component({ data, loading, error }: Props) {
  if (loading) return <Loading />
  if (error) return <Error message={error.message} />
  if (!data) return <Empty />

  return <Content data={data} />
}
```

### Event Handlers
```tsx
'use client'

export function Form() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    // Process form...
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* fields */}
    </form>
  )
}
```

---

## Code Quality Rules

### No Magic Numbers
```typescript
// BAD
if (items.length > 10) { ... }

// GOOD
const MAX_ITEMS = 10
if (items.length > MAX_ITEMS) { ... }
```

### No Deep Nesting (Max 3 Levels)
```typescript
// BAD
if (a) {
  if (b) {
    if (c) {
      if (d) {
        // Too deep
      }
    }
  }
}

// GOOD - Early returns
if (!a) return
if (!b) return
if (!c) return
if (d) {
  // Clean
}
```

### Single Responsibility
```typescript
// BAD - Does too much
function processUserData(user) {
  validateUser(user)
  saveToDatabase(user)
  sendEmail(user)
  updateCache(user)
}

// GOOD - Separate concerns
function validateUser(user) { ... }
function saveUser(user) { ... }
function notifyUser(user) { ... }
```

### Descriptive Names
```typescript
// BAD
const d = getData()
const x = d.filter(i => i.a > 5)

// GOOD
const workouts = getWorkouts()
const recentWorkouts = workouts.filter(w => w.daysAgo < 7)
```

---

## Supabase Patterns (Project-Specific)

### Query with Error Alias
```typescript
// GOOD - Use dbError to avoid conflict with logger
const { data, error: dbError } = await supabase
  .from('clients')
  .select('*')
  .eq('active', true)

if (dbError) {
  error('Database error:', dbError)
  throw dbError
}
```

### With Types
```typescript
import { Database } from '@/types/supabase'

type Client = Database['public']['Tables']['clients']['Row']

const { data, error: dbError } = await supabase
  .from('clients')
  .select('*')
  .returns<Client[]>()
```

### Server-Side Client
```typescript
import { createClient } from '@/lib/supabase/server'

export async function getData() {
  const supabase = await createClient()

  const { data, error: dbError } = await supabase
    .from('table')
    .select('*')

  if (dbError) throw dbError
  return data
}
```
