# Code Review Process

## Purpose

Review code changes to ensure alignment with project objectives and standards defined in CLAUDE.md.

---

## When to Use

- After implementing new features
- Before committing significant changes
- Reviewing pull requests
- Validating code written by others
- After refactoring sessions

---

## Review Process

### 1. Project Context Analysis

Before reviewing code:
- Read CLAUDE.md for project standards
- Identify architectural requirements
- Note security requirements
- Understand naming conventions

### 2. Code Evaluation

Evaluate against:

**Objective Alignment**
- Does the code advance project goals?
- Is it the right solution for the problem?

**Architectural Compliance**
- Follows Next.js App Router patterns?
- API routes for business logic?
- Server-side processing for sensitive data?

**Security Standards**
- No exposed secrets or credentials?
- RLS policies respected?
- Input validation present?

**Code Standards**
- TypeScript strict compliance?
- No `any` types?
- Proper error handling?
- Follows naming conventions?

**Technology Integration**
- Proper Supabase usage?
- Tailwind CSS patterns?
- React best practices?

### 3. Quality Assessment

Check for:
- Functional correctness
- Code maintainability
- Performance implications
- Error handling
- Edge cases covered
- Documentation completeness

---

## Review Report Structure

### Summary
- Overall alignment with project objectives
- Security compliance status
- Quality score (Critical/Major/Minor issues)

### Issues Found (by priority)

**Critical** (must fix):
- Security vulnerabilities
- Architectural violations
- Breaking changes

**Major** (should fix):
- Performance issues
- Significant standard deviations
- Missing error handling

**Minor** (nice to fix):
- Style inconsistencies
- Documentation gaps
- Naming improvements

### Recommendations
- Concrete, actionable suggestions
- Code examples when helpful
- References to CLAUDE.md standards

---

## Project-Specific Checks

### This Project (Odisea Antifragil)

**Always verify:**
- [ ] Uses `name` and `active` for clients (not `full_name`/`is_active`)
- [ ] Never uses `gym_clients` view
- [ ] Supabase errors renamed to `dbError`
- [ ] No emojis in code (use MaterialIcon)
- [ ] B2C model respected (1 trainer, multiple clients)

**Security checks:**
- [ ] No exposed API keys
- [ ] RLS not disabled without reason
- [ ] Server-side validation for sensitive ops

**Quality checks:**
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Functionality tested

---

## Review Principles

1. **Be specific** - Point to exact lines/issues
2. **Explain why** - Not just what's wrong, but why it matters
3. **Be constructive** - Offer solutions, not just criticism
4. **Prioritize** - Focus on impactful issues first
5. **Acknowledge good work** - Note what's done well

---

## Example Review Output

```
## Code Review: src/app/api/workouts/route.ts

### Summary
Code generally follows project standards. 2 issues found.

### Issues

**Major:**
1. Line 23: Uses `any` type for request body
   - Fix: Define `CreateWorkoutRequest` interface
   - Reference: CLAUDE.md prohibits `any`

**Minor:**
1. Line 45: Variable named `error` conflicts with logger
   - Fix: Rename to `dbError`

### Recommendations
- Add input validation for workout parameters
- Consider adding rate limiting for this endpoint

### What's Good
- Proper use of server-side Supabase client
- Good error handling structure
- Clear function naming
```
