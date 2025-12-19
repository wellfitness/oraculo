---
name: "Web Quality Enforcer"
description: "This skill should be used for JavaScript/TypeScript web development (React, Next.js, Node.js) when clean, production-ready code is required. Enforces zero tolerance for TypeScript errors, ESLint warnings, and untested code. Use for implementing features, fixing bugs, refactoring, or reviewing code where code quality is non-negotiable."
---

# Web Quality Enforcer

## Core Philosophy

**Quality > Speed. Always.**

This skill enforces ZERO TOLERANCE for technical debt. Code must pass ALL quality checks before committing.

### NEVER:
- Create TypeScript errors
- Introduce ESLint warnings
- Skip verification steps
- Commit broken code
- Use `any` types without explicit justification
- Leave TODOs in code without tracking
- Advance to next task with failing tests

### ALWAYS:
- Plan before coding
- Write clean TypeScript from the start
- Verify compilation after each change
- Test functionality thoroughly
- Document what you built
- Commit only when everything passes

---

## Mandatory Workflow (8 Phases)

Every task follows this workflow. **NEVER SKIP PHASES.**

| Phase | Name | Key Actions |
|-------|------|-------------|
| 1 | PLAN | Understand requirements, check existing code, design solution |
| 2 | IMPLEMENT | Write code following Next.js/TypeScript best practices |
| 3 | VERIFY TypeScript | Run `npx tsc --noEmit` - must be 0 errors |
| 4 | VERIFY ESLint | Run `npm run lint` - must be 0 warnings |
| 5 | TEST | Dev server test + Playwright visual testing |
| 6 | DOCUMENT | Code comments, component docs, changelog |
| 7 | COMMIT | Only after all checks pass |
| 8 | VERIFY COMMIT | Confirm Husky hooks passed |

For detailed workflow instructions, see `references/workflow.md`.

---

## Critical Rules

### TypeScript Standards
- **ALWAYS** define types for all data structures
- **NEVER** use `any` (unless absolutely necessary with comment)
- Use proper error types with `instanceof Error`
- Apply null safety with `?.` and `??`

### Code Quality
- No magic numbers - use constants
- No deep nesting - max 3 levels
- Single responsibility - one function = one purpose
- Descriptive names - `getUserWorkouts()` not `getData()`
- Always handle errors explicitly

### Commit Rules
- **DO NOT** use `git add .` (too broad)
- **DO NOT** use `git commit -am` (bypasses review)
- **DO NOT** use `--no-verify` (defeats quality checks)
- Only commit when: 0 TS errors, 0 ESLint warnings, tests passing

---

## Error Handling Protocol

### If TypeScript Fails:
1. Read error output carefully
2. Identify root cause (missing type, wrong type, etc.)
3. Fix the issue (don't use `any` as bandaid)
4. Re-verify with `npx tsc --noEmit`
5. Repeat until clean

### If ESLint Fails:
1. Read warning/error messages
2. Fix each issue (don't disable rules)
3. Re-verify with `npm run lint`
4. If legitimate: Use `eslint-disable-next-line` with comment explaining WHY

### If Husky Blocks Commit:
1. DO NOT bypass with `--no-verify`
2. Read error output
3. Fix the issues
4. Try commit again

---

## When to Use This Skill

### Perfect for:
- Implementing new features in Next.js
- Creating API routes with proper types
- Building React components
- Refactoring existing code
- Bug fixes requiring code changes
- **Code review** - Reviewing changes against project standards

### Do NOT use for:
- Simple file operations
- Database schema changes (use supabase-database-specialist)
- UI/UX design work (use ui-ux-designer)
- Documentation only (use tech-docs-generator)

---

## Reference Files

For detailed information, load these references as needed:

- `references/workflow.md` - Complete 8-phase workflow with examples
- `references/patterns.md` - Next.js, TypeScript, and React patterns
- `references/testing.md` - Playwright and verification procedures
- `references/code-review.md` - Code review process and checklists

---

## Quick Reference

### Verification Commands
```bash
npx tsc --noEmit     # TypeScript check
npm run lint         # ESLint check
npm run dev          # Dev server test
npm run test:e2e     # Playwright tests
```

### Commit Message Format
```
feat: add dashboard page with user stats

- Implement DashboardPage with server-side data fetching
- Add StatsCard component with TypeScript types
- All TypeScript/ESLint checks passing

Tested: tsc, eslint, playwright
```
