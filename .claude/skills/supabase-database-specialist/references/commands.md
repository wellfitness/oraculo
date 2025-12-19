# Database Commands Reference

---

## Supabase CLI (via scoop)

**Note:** Local development with `supabase start` requires Docker. For this project, use Supabase Dashboard SQL Editor instead.

### Available Commands (No Docker Required)

```bash
# Generate TypeScript types from remote database
supabase gen types typescript --project-id pisgvljinezombveiwnk > types/supabase.ts

# Link to remote project
supabase link --project-ref pisgvljinezombveiwnk

# View project status
supabase status

# List database migrations (remote)
supabase db diff

# Login to Supabase
supabase login
```

### Commands Requiring Docker (NOT available in this project)

```bash
# These require Docker - use Dashboard instead
supabase start          # Use Dashboard
supabase db reset       # Use Dashboard SQL Editor
supabase db push        # Use Dashboard SQL Editor
```

---

## PostgreSQL Queries (Run in Supabase SQL Editor)

### Introspection

```sql
-- List all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Describe table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'table_name'
ORDER BY ordinal_position;

-- List indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'table_name';

-- List RLS policies
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'table_name';

-- Check if RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- List functions
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public';

-- List triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### Performance Analysis

```sql
-- Explain query plan
EXPLAIN ANALYZE
SELECT * FROM table WHERE column = 'value';

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Unused indexes (candidates for removal)
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public';

-- Active connections
SELECT
  pid,
  usename,
  application_name,
  state,
  query_start,
  query
FROM pg_stat_activity
WHERE state != 'idle';

-- Long running queries
SELECT
  pid,
  now() - query_start AS duration,
  query
FROM pg_stat_activity
WHERE state = 'active'
AND now() - query_start > interval '30 seconds';
```

### Data Management

```sql
-- Count rows in table
SELECT COUNT(*) FROM table_name;

-- Get sample data
SELECT * FROM table_name LIMIT 10;

-- Check for duplicates
SELECT column, COUNT(*)
FROM table_name
GROUP BY column
HAVING COUNT(*) > 1;

-- Find orphaned records (missing FK)
SELECT t1.*
FROM child_table t1
LEFT JOIN parent_table t2 ON t1.parent_id = t2.id
WHERE t2.id IS NULL;
```

### Maintenance

```sql
-- Analyze table (update statistics)
ANALYZE table_name;

-- Vacuum table (reclaim space)
VACUUM table_name;

-- Full vacuum (locks table, use with caution)
VACUUM FULL table_name;

-- Reindex (rebuild indexes)
REINDEX TABLE table_name;
```

---

## Common Operations via Dashboard

### Create Table
```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
```

### Add Column
```sql
ALTER TABLE table_name
ADD COLUMN new_column TEXT;
```

### Add Index
```sql
CREATE INDEX idx_table_column
ON table_name(column_name);
```

### Add RLS Policy
```sql
CREATE POLICY "policy_name"
ON table_name
FOR SELECT
USING (auth.uid() = user_id);
```

### Drop with Safety Check
```sql
-- Check dependencies before dropping
SELECT
  dependent_ns.nspname as dependent_schema,
  dependent_view.relname as dependent_view
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
WHERE source_table.relname = 'table_to_drop';

-- Then drop if safe
DROP TABLE table_name;
```

---

## TypeScript Integration

### Generate Types
```bash
# Run from project root
supabase gen types typescript --project-id pisgvljinezombveiwnk > types/supabase.ts
```

### Query with Supabase Client
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Typed query
const { data, error: dbError } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId);
```

### Admin Operations (Server-Side Only)
```typescript
import { createClient } from '@supabase/supabase-js';

// Service role client - bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Admin query (use carefully!)
const { data, error: dbError } = await supabaseAdmin
  .from('table_name')
  .select('*');
```
