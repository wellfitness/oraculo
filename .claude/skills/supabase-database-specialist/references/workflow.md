# Database Workflow - 6 Phases

Complete workflow for any database operation. Follow in order.

---

## Phase 1: ANALYZE

Before touching the database:

### 1. Understand Requirements
- What data needs to be stored?
- Who can view/modify this data?
- Expected volume? (100 rows vs 1M rows)
- Relations with other tables?

### 2. Review Current Schema
- Read related existing tables
- Understand current relationships
- Identify existing RLS patterns
- Check `supabase/SUPABASE-SCHEMA.csv`

### 3. Identify Risks
- Can migration break existing queries?
- Can RLS policy block legitimate users?
- Does change affect performance?

**Output**: Detailed plan with risk analysis

---

## Phase 2: DESIGN

Create robust, scalable design:

### Schema Design Checklist

```sql
-- 1. IDs: UUID by default (better for distributed systems)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- 2. Timestamps: Always include
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()

-- 3. Soft deletes when appropriate
deleted_at TIMESTAMPTZ

-- 4. Foreign keys with appropriate cascades
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE

-- 5. Descriptive constraints
CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')

-- 6. Indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);

-- 7. Comments for documentation
COMMENT ON TABLE users IS 'User profiles with authentication data';
COMMENT ON COLUMN users.subscription_tier IS 'free|pro|enterprise';
```

**Output**: Complete SQL with explanatory comments

---

## Phase 3: VALIDATE

Verify design before implementation:

### Schema Validation Checklist
- [ ] Appropriate data types - TEXT vs VARCHAR, NUMERIC vs DECIMAL
- [ ] Foreign keys exist - Referential integrity guaranteed
- [ ] Useful constraints - NOT NULL, CHECK, UNIQUE where needed
- [ ] Necessary indexes - For foreign keys and common queries
- [ ] Consistent naming - snake_case, singular for tables
- [ ] Timestamps included - created_at, updated_at minimum
- [ ] Trigger for updated_at - Automatic update

### RLS Validation Checklist
- [ ] RLS enabled - `ALTER TABLE x ENABLE ROW LEVEL SECURITY`
- [ ] Policies for each operation - SELECT, INSERT, UPDATE, DELETE
- [ ] No accidental bypasses - Verify policies
- [ ] Acceptable performance - Policies don't cause N+1 queries
- [ ] Testing plan ready - How to verify they work

### Migration Safety Checklist
- [ ] Reversible - Has rollback plan
- [ ] Non-destructive - Or has backup plan
- [ ] Transaction wrapped - BEGIN/COMMIT for atomicity

---

## Phase 4: IMPLEMENT (Test First)

Apply changes in safe environment first:

### For This Project (No Local Docker)

1. **Write complete SQL script**
```sql
BEGIN;

-- Schema changes
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

2. **Test in Supabase SQL Editor** (Dashboard)
   - Go to SQL Editor in Supabase Dashboard
   - Run the script
   - Verify with `\d+ table_name` equivalent queries

3. **Verify structure**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions';
```

---

## Phase 5: TEST

Exhaustive testing BEFORE production:

### Test RLS Policies
```sql
-- Test 1: User can see only their subscription
-- (Run as authenticated user in Supabase)
SELECT * FROM subscriptions;
-- Must return only current user's subscriptions

-- Test 2: User CANNOT see others' subscriptions
SELECT * FROM subscriptions WHERE user_id = 'other-user-id';
-- Must return 0 rows

-- Test 3: Unauthenticated user sees nothing
-- (Run as anon role)
SELECT * FROM subscriptions;
-- Must return 0 rows

-- Test 4: Insert only allows current user's data
INSERT INTO subscriptions (user_id, stripe_subscription_id, status, current_period_end)
VALUES ('other-user-id', 'sub_xxx', 'active', NOW() + INTERVAL '1 month');
-- Must FAIL
```

### Test Performance
```sql
-- Verify queries use indexes
EXPLAIN ANALYZE
SELECT * FROM subscriptions
WHERE user_id = 'user-123'
ORDER BY created_at DESC
LIMIT 10;

-- Must show "Index Scan" not "Seq Scan"
```

### Approval Criteria
- All RLS tests pass
- Queries use appropriate indexes
- No errors in logs
- Acceptable performance (< 100ms for simple queries)

---

## Phase 6: DEPLOY (Production)

Only after successful testing:

### Pre-Deploy Checklist
- [ ] Backup created or backup plan ready
- [ ] Rollback plan ready - How to revert if something fails
- [ ] Downtime communicated - If applicable
- [ ] Monitoring ready - Logs and alerts active

### Deploy Process

1. **Verify current state**
```sql
-- Check if table/column already exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'subscriptions'
);
```

2. **Apply SQL via Supabase Dashboard**
   - Use SQL Editor
   - Run tested script
   - Verify immediately

3. **Verify**
```sql
-- Check structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'subscriptions';

-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'subscriptions';

-- Check policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'subscriptions';
```

4. **Test with test account**
   - Login with test user
   - Verify RLS works in production

5. **Monitor for 15 minutes**
   - Check Supabase logs
   - Verify no errors

### Mark Complete Only When:
- Migration applied successfully
- RLS verified working in production
- Queries return expected data
- No errors in logs
- Acceptable performance
