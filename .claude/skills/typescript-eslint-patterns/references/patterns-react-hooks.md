# Patterns: React Hooks

## Rule: `react-hooks/exhaustive-deps`

**Risk Level:** HIGH - Can cause infinite loops if done incorrectly
**Strategy:** Test exhaustively after EVERY change

---

## CRITICAL WARNING

Incorrect fixes to `exhaustive-deps` can:
- Cause infinite re-render loops
- Break functionality silently
- Create memory leaks

**Always test in browser after each fix!**

---

## Pattern 1: Add Missing Dependencies

```typescript
// BAD - Warning: userId missing in deps
useEffect(() => {
  fetchUserData(userId)
}, [])

// GOOD
useEffect(() => {
  fetchUserData(userId)
}, [userId])
```

---

## Pattern 2: setState is Stable (Safe to Include)

```typescript
// WARNING appears but setState is stable
const [data, setData] = useState([])

useEffect(() => {
  async function load() {
    const result = await fetchData()
    setData(result)
  }
  load()
}, []) // Warning: setData missing

// SOLUTION - Include it (safe, won't cause re-renders)
useEffect(() => {
  async function load() {
    const result = await fetchData()
    setData(result)
  }
  load()
}, [setData]) // setData is stable
```

---

## Pattern 3: Memoize Objects

Objects recreate on every render, causing infinite loops:

```typescript
// BAD - config recreates each render = infinite loop
const config = { timeout: 5000, retries: 3 }

useEffect(() => {
  setupWithConfig(config)
}, [config]) // Loops forever!

// GOOD - useMemo keeps reference stable
const config = useMemo(() => ({
  timeout: 5000,
  retries: 3
}), [])

useEffect(() => {
  setupWithConfig(config)
}, [config])
```

---

## Pattern 4: useCallback for Functions

Functions recreate on every render:

```typescript
// BAD - handleClick recreates = effect runs every render
const handleClick = () => {
  doSomething(value)
}

useEffect(() => {
  element.addEventListener('click', handleClick)
  return () => element.removeEventListener('click', handleClick)
}, [handleClick]) // Runs every render!

// GOOD
const handleClick = useCallback(() => {
  doSomething(value)
}, [value])

useEffect(() => {
  element.addEventListener('click', handleClick)
  return () => element.removeEventListener('click', handleClick)
}, [handleClick])
```

---

## Pattern 5: Refs Don't Need Dependencies

```typescript
// Refs are stable, don't need to be in deps
const inputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  inputRef.current?.focus()
}, []) // OK - ref is stable
```

---

## Pattern 6: External Functions (Outside Component)

```typescript
// Functions defined outside component are stable
function formatDate(date: Date) {
  return date.toISOString()
}

function MyComponent({ date }: Props) {
  useEffect(() => {
    console.log(formatDate(date))
  }, [date]) // formatDate doesn't need to be included
}
```

---

## Pattern 7: Dispatch from useReducer is Stable

```typescript
const [state, dispatch] = useReducer(reducer, initialState)

useEffect(() => {
  dispatch({ type: 'INIT' })
}, []) // dispatch is stable, but include it anyway

// GOOD - include it for clarity
useEffect(() => {
  dispatch({ type: 'INIT' })
}, [dispatch])
```

---

## Pattern 8: Props that Change Frequently

```typescript
// PROBLEM - searchTerm changes on every keystroke
useEffect(() => {
  fetchResults(searchTerm)
}, [searchTerm]) // Too many API calls!

// SOLUTION - Debounce
const debouncedSearch = useMemo(
  () => debounce((term: string) => fetchResults(term), 300),
  []
)

useEffect(() => {
  debouncedSearch(searchTerm)
}, [searchTerm, debouncedSearch])
```

---

## Pattern 9: Intentionally Empty Deps (Mount Only)

```typescript
// Sometimes you WANT it to run once
useEffect(() => {
  initializeOnce()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []) // Intentionally empty - run on mount only

// BETTER - Add comment explaining WHY
useEffect(() => {
  // Initialize analytics - should only run once on mount
  analytics.init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

---

## Pattern 10: Complex Dependencies

```typescript
// BAD - Object in deps causes infinite loop
useEffect(() => {
  doSomething(user.settings)
}, [user]) // user object changes reference

// GOOD - Use specific property
useEffect(() => {
  doSomething(user.settings)
}, [user.settings])

// OR - Use JSON.stringify for deep comparison (use sparingly)
const settingsKey = JSON.stringify(user.settings)
useEffect(() => {
  doSomething(user.settings)
}, [settingsKey])
```

---

## Testing Checklist After Each Fix

- [ ] `npm run dev` - Server starts
- [ ] Open affected page in browser
- [ ] Check console - NO errors, NO infinite logs
- [ ] Interact with feature - Works correctly
- [ ] Check Network tab - No repeated requests
- [ ] Navigate away and back - Still works

---

## Common Infinite Loop Patterns

### Loop 1: Object in useEffect that sets state
```typescript
// INFINITE LOOP
useEffect(() => {
  setData({ ...data, loaded: true })
}, [data]) // data changes = effect runs = data changes...
```

### Loop 2: Array filter/map in deps
```typescript
// INFINITE LOOP
const filtered = items.filter(x => x.active)
useEffect(() => {
  process(filtered)
}, [filtered]) // New array every render!
```

### Loop 3: Inline object/function
```typescript
// INFINITE LOOP
useEffect(() => {
  setup({ debug: true })
}, [{ debug: true }]) // New object every render!
```

---

## When to Use eslint-disable

```typescript
// ACCEPTABLE - Truly mount-only effect
useEffect(() => {
  // Subscribe to external event source
  const subscription = eventSource.subscribe()
  return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []) // Mount only - eventSource is external singleton
```

**Always document WHY with a comment.**
