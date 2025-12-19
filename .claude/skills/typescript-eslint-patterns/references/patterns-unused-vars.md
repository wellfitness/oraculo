# Patterns: Unused Variables

## Rule: `@typescript-eslint/no-unused-vars`

**Risk Level:** LOW
**Strategy:** Remove or prefix with underscore

---

## Pattern 1: Remove Unused Imports

```typescript
// BAD
import { useState, useEffect, useMemo } from 'react'
const MyComponent = () => {
  const [data] = useState([])
  // useMemo and useEffect never used
}

// GOOD
import { useState } from 'react'
const MyComponent = () => {
  const [data] = useState([])
}
```

---

## Pattern 2: Prefix Intentionally Unused Parameters

Use underscore prefix for parameters required by signature but not used:

```typescript
// BAD - request never used
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok' })
}

// GOOD
export async function GET(_request: NextRequest) {
  return NextResponse.json({ status: 'ok' })
}
```

### Common Cases:
- API route handlers: `_request`, `_context`
- Callbacks: `_event`, `_index`
- Middleware: `_next`

---

## Pattern 3: Unused Variables in Catch Blocks

```typescript
// BAD - err never used
try {
  await operation()
} catch (err) {
  return { error: 'Failed' }
}

// GOOD - prefixed
try {
  await operation()
} catch (_err) {
  return { error: 'Failed' }
}

// BETTER - if you need to log
try {
  await operation()
} catch (err) {
  console.error('Operation failed:', err)
  return { error: 'Failed' }
}
```

---

## Pattern 4: Unused Destructured Variables

```typescript
// BAD - count never used
const { data, count } = await fetchData()
processData(data)

// GOOD - omit unused
const { data } = await fetchData()
processData(data)

// ALTERNATIVE - if needed for type inference
const { data, count: _count } = await fetchData()
processData(data)
```

---

## Pattern 5: Unused Function Parameters (Middle Position)

When unused parameter is in the middle of signature:

```typescript
// BAD
function handler(req, res, next) {
  // res never used
  req.process()
  next()
}

// GOOD
function handler(req, _res, next) {
  req.process()
  next()
}
```

---

## Pattern 6: Unused Loop Variables

```typescript
// BAD
array.forEach((item, index) => {
  // index never used
  process(item)
})

// GOOD
array.forEach((item, _index) => {
  process(item)
})

// BETTER - if index truly not needed
array.forEach((item) => {
  process(item)
})
```

---

## Pattern 7: Unused Type Imports

```typescript
// BAD - SomeType imported but never used
import { useState, SomeType } from 'react'

// GOOD - remove unused type
import { useState } from 'react'

// NOTE: Type-only imports
import type { SomeType } from './types'  // OK if used in type annotations
```

---

## Checklist Before Fix

- [ ] Is the variable truly unused, or used in a template literal?
- [ ] Is it a callback parameter required by the interface?
- [ ] Could it be used for debugging later? (consider keeping with `_`)
- [ ] Is it part of a destructuring where other parts are used?

---

## Common Mistakes

### Don't Remove Variables Used in JSX
```typescript
// WRONG - looks unused but used in JSX
const isLoading = true
// ... later in JSX
{isLoading && <Spinner />}
```

### Don't Remove Variables Used in Type Annotations
```typescript
// WRONG - looks unused but used for type
const config: Config = { ... }
type ConfigKeys = keyof typeof config
```
