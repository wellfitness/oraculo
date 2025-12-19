# Web Quality Enforcer - Complete Workflow

## Phase 1: PLAN

Before writing ANY code:

### 1. Understand Requirements
- What feature/fix is needed?
- What are the acceptance criteria?
- What files will be affected?
- What types/interfaces are needed?

### 2. Check Existing Code
- Read related files to understand patterns
- Identify existing types to reuse
- Check for similar implementations
- Verify current project structure

### 3. Design Solution
- Plan file structure
- Design type definitions
- Identify dependencies
- Plan error handling strategy

### 4. Estimate Impact
- How many files will change?
- What tests are needed?
- Are there breaking changes?

**Output**: Brief plan with files to modify and approach

---

## Phase 2: IMPLEMENT

Write code following Next.js 15+ best practices.

### Server Components (Default)
```tsx
// app/dashboard/page.tsx
import { getUserStats } from '@/lib/api'

export default async function DashboardPage() {
  const stats = await getUserStats()

  return (
    <div>
      <h1>Dashboard</h1>
      <StatsCard stats={stats} />
    </div>
  )
}
```

### Client Components (When Needed)
```tsx
'use client'

import { useState } from 'react'

export function InteractiveForm() {
  const [value, setValue] = useState('')
  // ... client-side logic
}
```

### API Routes (App Router)
```tsx
// app/api/workouts/route.ts
import { NextRequest, NextResponse } from 'next/server'

interface CreateWorkoutRequest {
  name: string
  exercises: Exercise[]
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateWorkoutRequest = await request.json()

    // Validation
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Implementation
    const workout = await createWorkout(body)

    return NextResponse.json(workout, { status: 201 })
  } catch (err) {
    console.error('Error creating workout:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Phase 3: VERIFY TypeScript

**MANDATORY** after writing code:

```bash
npx tsc --noEmit
```

**If errors found**:
1. Read error messages carefully
2. Fix ALL errors (no skipping)
3. Re-run `npx tsc --noEmit`
4. Repeat until ZERO errors

**Common TypeScript Fixes**:
- Missing properties in interfaces
- Type mismatches in assignments
- Incorrect function return types
- Missing null checks
- Wrong generic types

**DO NOT PROCEED** until TypeScript passes 100%.

---

## Phase 4: VERIFY ESLint

**MANDATORY** after TypeScript passes:

```bash
# Check specific files modified
npm run lint -- path/to/file.tsx

# Or check all
npm run lint
```

**If warnings/errors found**:
1. Fix ALL issues (no warnings allowed)
2. Re-run lint
3. Repeat until clean

**Common ESLint Fixes**:
- Remove unused imports
- Add missing dependencies to useEffect
- Fix key prop in lists
- Remove console.logs (use proper logging)
- Fix accessibility issues

**DO NOT PROCEED** until ESLint passes 100%.

---

## Phase 5: TEST Functionality

### A. Development Server Test

```bash
npm run dev
```

**Verify**:
- [ ] Page/component renders without errors
- [ ] No console errors in browser
- [ ] No console warnings
- [ ] Functionality works as expected
- [ ] No hydration errors

### B. Playwright Visual Testing (For UI Changes)

**When to use Playwright**:
- New pages or components
- UI changes
- Form submissions
- Navigation flows
- Interactive features

**Run Playwright tests**:
```bash
npm run test:e2e

# Or specific test
npx playwright test path/to/test.spec.ts
```

**Example test**:
```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test'

test('dashboard displays user stats', async ({ page }) => {
  await page.goto('/dashboard')

  // Verify elements render
  await expect(page.locator('h1')).toContainText('Dashboard')

  // Verify data loads
  await expect(page.locator('[data-testid="stats"]')).toBeVisible()

  // Take screenshot for visual regression
  await expect(page).toHaveScreenshot('dashboard.png')
})
```

**DO NOT PROCEED** until tests pass.

---

## Phase 6: DOCUMENT

### A. Code Comments (For Complex Logic)
```typescript
/**
 * Calculates workout intensity based on sets, reps, and weight
 * Uses Brzycki formula: weight x (36 / (37 - reps))
 *
 * @param sets - Number of sets performed
 * @param reps - Repetitions per set
 * @param weight - Weight used in kg
 * @returns Intensity score (0-100)
 */
function calculateIntensity(sets: number, reps: number, weight: number): number {
  // Implementation
}
```

### B. Component Documentation
```tsx
/**
 * WorkoutCard - Displays workout summary with stats
 *
 * @component
 * @example
 * <WorkoutCard
 *   workout={workout}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 */
interface WorkoutCardProps {
  workout: Workout
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}
```

### C. Changelog Entry (For Significant Changes)
```markdown
## [Unreleased]

### Added
- Dashboard page with user stats and activity feed
- Workout intensity calculation algorithm

### Changed
- Updated workout card to show intensity score
```

---

## Phase 7: COMMIT

**Pre-commit verification**:
```bash
npm run lint
npx tsc --noEmit
npm run test:e2e  # If applicable
```

**If Husky is configured**, it will block commit if:
- TypeScript has errors
- ESLint has errors/warnings
- Tests fail
- Pre-commit hooks fail

**Commit message format**:
```bash
git add [specific-files]
git commit -m "feat: add dashboard page with user stats

- Implement DashboardPage with server-side data fetching
- Add StatsCard component with TypeScript types
- Add Playwright test for dashboard rendering
- All TypeScript/ESLint checks passing

Tested: tsc, eslint, playwright"
```

**ONLY commit when**:
- Zero TypeScript errors
- Zero ESLint warnings
- Tests passing
- Functionality verified
- Documentation complete

---

## Phase 8: VERIFY Commit Success

After commit:

```bash
# Verify clean state
git status

# Verify commit was successful
git log -1 --stat
```

**Confirm**:
- [ ] Commit succeeded
- [ ] All files committed
- [ ] No uncommitted changes remain
- [ ] Husky hooks passed

---

## Multi-Task Projects

When implementing multiple related features:

### Task Breakdown

**DO**:
```
Task 1: Implement API endpoint
  -> Plan -> Code -> Verify -> Test -> Document -> Commit
Task 2: Create UI component
  -> Plan -> Code -> Verify -> Test -> Document -> Commit
Task 3: Connect UI to API
  -> Plan -> Code -> Verify -> Test -> Document -> Commit
```

**DON'T**:
```
Implement everything -> Try to fix 500 TypeScript errors -> Give up
```

### Progress Tracking

Use TODO comments strategically:
```typescript
// TODO: Add pagination to workout list (Issue #123)
```

But clear TODOs before committing when possible.

---

## Emergency Procedures

### If You Create Many TypeScript Errors

**STOP IMMEDIATELY**:
1. Do NOT continue coding
2. Run `npx tsc --noEmit` to see all errors
3. **Consider reverting**: `git restore .` (if not committed)
4. **Re-plan**: Design proper types FIRST
5. **Implement incrementally**: Fix types as you code

### If Husky Won't Let You Commit

**DO NOT** use `--no-verify`:
1. This defeats the whole purpose
2. Read what Husky is complaining about
3. Fix those issues
4. Commit again
