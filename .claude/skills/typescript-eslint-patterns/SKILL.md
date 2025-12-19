---
name: "TypeScript ESLint Patterns"
description: "Reference patterns for fixing TypeScript and ESLint errors. Use when you need detailed examples for: no-unused-vars, no-explicit-any, react-hooks/exhaustive-deps, and logger error handling conflicts. Companion skill for typescript-eslint-fixer agent."
---

# TypeScript ESLint Patterns

## Purpose

This skill provides detailed code patterns and examples for fixing common TypeScript and ESLint issues. It's designed to be invoked by the `typescript-eslint-fixer` agent when detailed reference is needed.

---

## Pattern Categories

### 1. Unused Variables (`@typescript-eslint/no-unused-vars`)
**Reference:** `references/patterns-unused-vars.md`
- Remove unused imports
- Prefix intentionally unused parameters with `_`
- Clean up catch blocks
- Handle destructuring

### 2. Type Safety (`@typescript-eslint/no-explicit-any`)
**Reference:** `references/patterns-type-safety.md`
- Define interfaces for data structures
- Use `unknown` + type guards
- Type API routes properly
- Type Supabase queries with generics

### 3. React Hooks (`react-hooks/exhaustive-deps`)
**Reference:** `references/patterns-react-hooks.md`
- Add missing dependencies safely
- Use `useMemo` for objects
- Use `useCallback` for functions
- Handle stable references (setState)

### 4. Error Handling (`logger conflict`)
**Reference:** `references/patterns-error-handling.md`
- Rename Supabase `error` to `dbError`
- Use `err` in catch blocks
- Rename callback parameters

---

## Quick Reference

### Priority Order
1. **React Hooks** - HIGHEST RISK (can cause infinite loops)
2. **Type Safety** - MEDIUM RISK (improves maintainability)
3. **Unused Vars** - LOW RISK (quick wins)

### Golden Rules
- TypeScript compilation > ESLint rules
- If ESLint fix breaks TypeScript, use `eslint-disable-next-line`
- Always document WHY a rule is disabled
- Test after EVERY change

### Verification Commands
```bash
npx tsc --noEmit              # Must pass
npm run lint -- [file]        # Must pass
npm run dev                   # Must start
```

---

## When to Use Each Reference

| Situation | Reference File |
|-----------|----------------|
| Unused import warnings | `patterns-unused-vars.md` |
| `any` type errors | `patterns-type-safety.md` |
| Missing deps in useEffect | `patterns-react-hooks.md` |
| Logger/error name conflict | `patterns-error-handling.md` |

---

## Commit Message Pattern

```
fix(eslint): [error-type] - [description] ([X] files)

- Files modified
- Errors resolved: [N]
- Verified: [feature tested]
```
