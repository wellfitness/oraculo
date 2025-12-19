---
name: "Supabase Database Specialist"
description: "This skill should be used when working with Supabase/PostgreSQL database operations including schema design, RLS policies, migrations, and query optimization. Prioritizes security and data integrity over speed. Use for: designing new tables, creating RLS policies, optimizing slow queries, writing safe migrations, or troubleshooting database issues."
---

# Supabase Database Specialist

## Core Philosophy

**Safety > Speed. Data is Sacred.**

There is no "undo" in production. A poorly designed RLS policy = security vulnerability. A bad schema = painful refactoring. A migration without backup = data loss.

This skill treats the database with the respect it deserves.

---

## Project-Specific Configuration

**Supabase Project:**
- URL: `https://pisgvljinezombveiwnk.supabase.co`
- Project Ref: `pisgvljinezombveiwnk`

**Working with Database:**
- Use TypeScript scripts with `@supabase/supabase-js` for programmatic operations
- Use `.sql` scripts for Supabase SQL Editor (web interface)
- Supabase CLI available via scoop (limited - no Docker for local dev)
- NO migration files - apply SQL directly via Supabase Dashboard

**Schema Reference (ALWAYS check before DB operations):**
- `supabase/SUPABASE-SCHEMA.csv` - Table structures, columns, types, FKs
- `supabase/SUPABASE-FUNCTION.csv` - Available functions and triggers

---

## Critical Security Rules

### NEVER:
1. Disable RLS without valid reason - Every table must have RLS enabled
2. Apply migrations to production without testing - Test SQL in Dashboard first
3. Hardcode secrets in Edge Functions - Use environment variables
4. Ignore foreign key constraints - Referential integrity is critical
5. Expose sensitive data - PII must be protected with RLS
6. Make destructive changes without backup plan

### ALWAYS:
1. Test RLS policies exhaustively - Verify users cannot see others' data
2. Document schema decisions - Future you will thank you
3. Use transactions for complex operations - BEGIN/COMMIT/ROLLBACK
4. Create indexes for frequent queries - Performance matters
5. Validate data with constraints - Database is source of truth
6. Use parameterized queries - Prevent SQL injection

---

## Areas of Expertise

1. **Schema Design** - Tables, types, relations, constraints, indexes
2. **Row Level Security (RLS)** - Policies for auth, multi-tenant isolation, roles
3. **Migrations** - Safe, reversible changes with rollback plans
4. **Performance** - Indexes, EXPLAIN ANALYZE, query optimization
5. **Supabase Features** - Edge Functions, Storage, Realtime, Auth
6. **PostgreSQL Advanced** - Triggers, PL/pgSQL, JSONB, full-text search

---

## Workflow Overview

For any database operation, follow the 6-phase workflow:

1. **ANALYZE** - Understand requirements, review existing schema, identify risks
2. **DESIGN** - Create robust, scalable design with proper types and constraints
3. **VALIDATE** - Verify design before implementation (checklist review)
4. **IMPLEMENT** - Apply changes in staging/test environment first
5. **TEST** - Exhaustive RLS and performance testing
6. **DEPLOY** - Production deployment with backup and monitoring

For detailed workflow instructions, refer to `references/workflow.md`.

---

## When to Use This Skill

### Perfect for:
- Designing new table schemas
- Creating or modifying RLS policies
- Optimizing slow queries
- Writing safe migrations
- Implementing Edge Functions
- Setting up Storage buckets
- Full-text search implementation
- Database security audits

### Do NOT use for:
- Simple read queries (handle directly)
- UI/UX changes
- Frontend code
- Documentation tasks

---

## Reference Files

For detailed information, load these references as needed:

- `references/workflow.md` - Complete 6-phase workflow with checklists
- `references/patterns.md` - SQL patterns, RLS examples, common pitfalls
- `references/commands.md` - PostgreSQL and Supabase CLI commands

---

## Quick Reference: Schema Design Principles

```sql
-- UUID primary keys (distributed-friendly)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Always include timestamps
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()

-- Foreign keys with appropriate cascades
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE

-- Descriptive constraints
CONSTRAINT positive_amount CHECK (amount > 0)

-- Index foreign keys and frequent query columns
CREATE INDEX idx_table_column ON table(column);
```

## Quick Reference: RLS Pattern

```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- User sees own data
CREATE POLICY "Users view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);
```
