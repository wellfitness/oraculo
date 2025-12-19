# SQL Patterns, RLS Examples & Common Pitfalls

---

## RLS Design Patterns

### Pattern 1: User Sees Own Data Only
```sql
CREATE POLICY "Users can view own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);
```

### Pattern 2: Multi-tenant Isolation
```sql
CREATE POLICY "Users see data from their organization"
  ON projects
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );
```

### Pattern 3: Public Read, Authenticated Write
```sql
CREATE POLICY "Anyone can view published posts"
  ON posts
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authors can update own posts"
  ON posts
  FOR UPDATE
  USING (auth.uid() = author_id);
```

### Pattern 4: Admin Bypass (Use Carefully)
```sql
CREATE POLICY "Admins can do anything"
  ON any_table
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

### Pattern 5: Service Role Only (Background Jobs)
```sql
-- Policy that only allows service_role
CREATE POLICY "Service role only"
  ON sensitive_table
  FOR ALL
  USING (auth.role() = 'service_role');
```

---

## Schema Design Patterns

### Complete Table Template
```sql
CREATE TABLE example (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Data columns
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Indexes
CREATE INDEX idx_example_user ON example(user_id);
CREATE INDEX idx_example_status ON example(status) WHERE status = 'active';
CREATE INDEX idx_example_created ON example(created_at DESC);

-- RLS
ALTER TABLE example ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON example
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE example IS 'Description of table purpose';
```

### JSONB with GIN Index
```sql
-- Column for flexible metadata
metadata JSONB DEFAULT '{}',

-- GIN index for JSONB queries
CREATE INDEX idx_table_metadata ON table USING GIN (metadata);

-- Query example
SELECT * FROM table WHERE metadata @> '{"key": "value"}';
```

### Enum-like with CHECK Constraint
```sql
-- Preferred over actual ENUM (easier to modify)
status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled'))
```

### Partial Index for Performance
```sql
-- Index only active records (smaller, faster)
CREATE INDEX idx_subscriptions_active
  ON subscriptions(user_id)
  WHERE status = 'active';
```

---

## Common Pitfalls and Solutions

### 1. RLS Performance Issues

**Problem:** Policy causes N+1 queries
```sql
-- BAD: Subquery in RLS executes per row
CREATE POLICY "bad_policy" ON posts
  FOR SELECT USING (
    user_id IN (SELECT user_id FROM friends WHERE friend_id = auth.uid())
  );
```

**Solution:** Use EXISTS with proper index
```sql
-- GOOD: Optimized with index
CREATE INDEX idx_friends_lookup ON friends(friend_id, user_id);

CREATE POLICY "good_policy" ON posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friends
      WHERE friend_id = auth.uid()
      AND user_id = posts.user_id
    )
  );
```

### 2. Missing Indexes on Foreign Keys

**Problem:** Foreign key without index causes seq scan
```sql
-- Seq scan on every JOIN
CREATE TABLE posts (
  author_id UUID REFERENCES users(id)
);
```

**Solution:** Always index foreign keys
```sql
CREATE INDEX idx_posts_author ON posts(author_id);
```

### 3. Destructive Column Rename

**Problem:** Renaming column loses data
```sql
-- DO NOT: Loses data
ALTER TABLE users DROP COLUMN old_name;
ALTER TABLE users ADD COLUMN new_name TEXT;
```

**Solution:** 3-step migration
```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN new_name TEXT;

-- Step 2: Copy data
UPDATE users SET new_name = old_name;

-- Step 3: (After deploying code using new_name) Drop old column
-- ALTER TABLE users DROP COLUMN old_name;
```

### 4. RLS Not Enabled

**Problem:** Table has policies but RLS not enabled
```sql
-- Policies exist but do nothing!
CREATE POLICY "policy" ON table ...;
```

**Solution:** Always enable RLS explicitly
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
-- Then create policies
```

### 5. Missing INSERT/UPDATE Policies

**Problem:** Only SELECT policy exists
```sql
-- User can see but not create their own data
CREATE POLICY "select_own" ON items FOR SELECT USING (auth.uid() = user_id);
```

**Solution:** Create policies for all operations
```sql
CREATE POLICY "insert_own" ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON items FOR DELETE
  USING (auth.uid() = user_id);
```

### 6. Forgetting updated_at Trigger

**Problem:** updated_at never updates
```sql
-- Column exists but stays at creation time
updated_at TIMESTAMPTZ DEFAULT NOW()
```

**Solution:** Add trigger (if function exists in project)
```sql
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

Or create the function if it doesn't exist:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Index Strategy Guide

### When to Create Indexes

| Scenario | Index Type | Example |
|----------|-----------|---------|
| Foreign keys | B-tree | `CREATE INDEX idx_posts_user ON posts(user_id)` |
| Unique lookups | B-tree UNIQUE | `CREATE UNIQUE INDEX idx_users_email ON users(email)` |
| Range queries | B-tree | `CREATE INDEX idx_orders_date ON orders(created_at)` |
| JSONB containment | GIN | `CREATE INDEX idx_meta ON t USING GIN(metadata)` |
| Full-text search | GIN | `CREATE INDEX idx_search ON t USING GIN(to_tsvector('spanish', content))` |
| Array contains | GIN | `CREATE INDEX idx_tags ON t USING GIN(tags)` |

### Composite Index Order
```sql
-- Order matters! Most selective first, or match query order
-- For: WHERE user_id = ? AND created_at > ?
CREATE INDEX idx_user_created ON posts(user_id, created_at DESC);
```

---

## Useful Query Patterns

### Upsert (Insert or Update)
```sql
INSERT INTO settings (user_id, key, value)
VALUES ('user-123', 'theme', 'dark')
ON CONFLICT (user_id, key)
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

### Soft Delete Query
```sql
-- Only get non-deleted
SELECT * FROM items WHERE deleted_at IS NULL;

-- Soft delete
UPDATE items SET deleted_at = NOW() WHERE id = 'xxx';
```

### Pagination with Cursor
```sql
-- More efficient than OFFSET for large tables
SELECT * FROM posts
WHERE created_at < '2024-01-15T10:00:00Z'
ORDER BY created_at DESC
LIMIT 20;
```
