# Patterns: Error Handling

## Problem: Logger Conflict

This project uses a logger from `@/lib/logger` that exports an `error()` function. This conflicts with common patterns where variables are named `error`.

---

## The Conflict

```typescript
import { error } from '@/lib/logger'

// CONFLICT - 'error' is now the logger function
const { data, error } = await supabase.from('table').select('*')
// TypeScript Error: Cannot redeclare 'error'
```

---

## Pattern 1: Supabase Queries - Rename to `dbError`

```typescript
// BAD - Conflicts with logger
const { data, error } = await supabase
  .from('table')
  .select('*')

if (error) {
  error('Database error:', error)  // TypeError!
}

// GOOD
const { data, error: dbError } = await supabase
  .from('table')
  .select('*')

if (dbError) {
  error('Database error:', dbError)  // Logger function works
  return
}
```

---

## Pattern 2: Catch Blocks - Use `err`

```typescript
// BAD - Conflicts with logger
try {
  await someOperation()
} catch (error) {
  error('Operation failed:', error)  // TypeError!
}

// GOOD
try {
  await someOperation()
} catch (err) {
  error('Operation failed:', err)  // Logger function works
  throw err
}
```

---

## Pattern 3: Callback Parameters - Rename

```typescript
// BAD
onError: (error) => {
  error('API error:', error)  // TypeError!
}

// GOOD
onError: (apiError) => {
  error('API error:', apiError)  // Logger function works
}

// ALTERNATIVE names:
// - fetchError
// - queryError
// - mutationError
// - validationError
```

---

## Pattern 4: Multiple Supabase Queries

```typescript
// GOOD - Different names for each
const { data: users, error: usersError } = await supabase
  .from('users')
  .select('*')

const { data: posts, error: postsError } = await supabase
  .from('posts')
  .select('*')

if (usersError) {
  error('Failed to fetch users:', usersError)
}

if (postsError) {
  error('Failed to fetch posts:', postsError)
}
```

---

## Pattern 5: Error State in Components

```typescript
// BAD
const [error, setError] = useState<string | null>(null)

// Conflicts if you import logger

// GOOD
const [errorMessage, setErrorMessage] = useState<string | null>(null)

// OR
const [formError, setFormError] = useState<string | null>(null)
```

---

## Pattern 6: Form Validation Errors

```typescript
// BAD
const errors = validateForm(data)
if (errors.length > 0) {
  error('Validation failed:', errors)  // OK here, but confusing
}

// GOOD - Clearer naming
const validationErrors = validateForm(data)
if (validationErrors.length > 0) {
  error('Validation failed:', validationErrors)
}
```

---

## Pattern 7: API Response Error

```typescript
// BAD
const response = await fetch('/api/data')
const { data, error } = await response.json()

// GOOD
const response = await fetch('/api/data')
const { data, error: responseError } = await response.json()

if (responseError) {
  error('API returned error:', responseError)
}
```

---

## Naming Convention Summary

| Context | Variable Name |
|---------|---------------|
| Supabase query | `dbError`, `queryError` |
| Catch block | `err` |
| API response | `apiError`, `responseError` |
| Form validation | `validationError`, `formError` |
| Mutation | `mutationError` |
| Component state | `errorMessage`, `errorState` |

---

## Files Without Logger Import

If a file doesn't import `{ error }` from logger, using `error` as variable name is fine:

```typescript
// No logger import - this is OK
const { data, error } = await supabase.from('table').select('*')

if (error) {
  console.error('Error:', error)
  return
}
```

**Check imports before "fixing" - it might not be broken!**

---

## Quick Check Before Fixing

1. Does file import from `@/lib/logger`?
2. Does it specifically import `error`?
3. Is there a naming conflict?

```typescript
// Check top of file for:
import { error } from '@/lib/logger'
// or
import { info, warn, error } from '@/lib/logger'

// If no such import, naming isn't a problem
```
