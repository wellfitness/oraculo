# Testing & Verification Reference

## Verification Commands

### TypeScript Check
```bash
npx tsc --noEmit
```

Must show: `Found 0 errors`

### ESLint Check
```bash
# All files
npm run lint

# Specific file
npm run lint -- path/to/file.tsx
```

Must show: No errors, no warnings

### Dev Server Test
```bash
npm run dev
```

Verify:
- Server starts without errors
- Page renders correctly
- No console errors in browser
- No hydration errors

### Playwright E2E Tests
```bash
# Run all tests
npm run test:e2e

# Run specific test
npx playwright test path/to/test.spec.ts

# Run with UI
npx playwright test --headed
```

---

## Playwright Test Patterns

### Basic Page Test
```typescript
import { test, expect } from '@playwright/test'

test('page loads correctly', async ({ page }) => {
  await page.goto('/dashboard')

  // Check title
  await expect(page).toHaveTitle(/Dashboard/)

  // Check element exists
  await expect(page.locator('h1')).toContainText('Dashboard')
})
```

### Form Submission Test
```typescript
test('form submits successfully', async ({ page }) => {
  await page.goto('/contact')

  // Fill form
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="message"]', 'Test message')

  // Submit
  await page.click('button[type="submit"]')

  // Verify success
  await expect(page.locator('.success-message')).toBeVisible()
})
```

### Authentication Test
```typescript
test('login flow', async ({ page }) => {
  await page.goto('/login')

  await page.fill('[name="email"]', 'user@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // Wait for redirect
  await page.waitForURL('/dashboard')

  // Verify logged in
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
})
```

### Visual Regression Test
```typescript
test('visual regression', async ({ page }) => {
  await page.goto('/dashboard')

  // Wait for content to load
  await page.waitForLoadState('networkidle')

  // Take screenshot
  await expect(page).toHaveScreenshot('dashboard.png')
})
```

### API Response Test
```typescript
test('API returns correct data', async ({ request }) => {
  const response = await request.get('/api/workouts')

  expect(response.ok()).toBeTruthy()

  const data = await response.json()
  expect(data).toHaveProperty('workouts')
  expect(Array.isArray(data.workouts)).toBeTruthy()
})
```

---

## Quality Metrics

After each commit, verify:

| Metric | Target |
|--------|--------|
| TypeScript Coverage | 100% (no `any` types) |
| ESLint Issues | 0 errors, 0 warnings |
| Test Coverage | All new code has tests |
| Console Errors | 0 in browser |
| Hydration Errors | 0 |
| Performance | No obvious bottlenecks |

---

## Pre-Commit Checklist

Before running `git commit`:

- [ ] `npx tsc --noEmit` - 0 errors
- [ ] `npm run lint` - 0 warnings
- [ ] `npm run dev` - Server starts OK
- [ ] Browser test - No console errors
- [ ] Functionality test - Feature works
- [ ] `npm run test:e2e` - Tests pass (if applicable)

---

## Common Test Selectors

### By Role (Preferred)
```typescript
page.getByRole('button', { name: 'Submit' })
page.getByRole('heading', { level: 1 })
page.getByRole('link', { name: 'Home' })
```

### By Test ID (For Complex Components)
```typescript
page.locator('[data-testid="workout-card"]')
page.getByTestId('submit-button')
```

### By Text
```typescript
page.getByText('Welcome back')
page.getByText(/loading/i)
```

### By Label (Forms)
```typescript
page.getByLabel('Email')
page.getByPlaceholder('Enter your email')
```

---

## Debugging Failed Tests

### See What's Happening
```bash
# Run with browser visible
npx playwright test --headed

# Run step by step
npx playwright test --debug

# Generate trace
npx playwright test --trace on
```

### View Test Report
```bash
npx playwright show-report
```

### Take Screenshot on Failure
```typescript
test('my test', async ({ page }) => {
  try {
    // test code
  } catch (e) {
    await page.screenshot({ path: 'failure.png' })
    throw e
  }
})
```

---

## Browser Console Verification

During manual testing, check browser console for:

- **Red errors** - Critical issues, must fix
- **Yellow warnings** - Should investigate
- **React hydration errors** - Server/client mismatch
- **Network errors** - Failed API calls
- **TypeScript runtime errors** - Type issues that escaped compile

### Common Console Issues

| Error | Likely Cause |
|-------|--------------|
| `Hydration failed` | Server/client HTML mismatch |
| `Cannot read property of undefined` | Missing null check |
| `Failed to fetch` | API endpoint issue |
| `Invalid hook call` | Hook called outside component |
| `Each child should have unique key` | Missing key prop in list |
