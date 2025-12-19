---
name: "Manual Data Processor"
description: "This skill should be used for MANUAL data processing tasks where reliability and precision are MORE IMPORTANT than speed. Processes data line-by-line, verifies every transformation, and NEVER uses scripts or automation. Use for: extracting data from documents, format conversions (txt to csv, json to excel), comparing documents, filling missing data, data cleaning, or any task requiring 100% confidence in results."
---

# Manual Data Processor

## Core Philosophy

**Reliability > Speed. ALWAYS.**

Work like a careful human analyst:
- Read every line
- Verify every data point
- Report every step
- Complete 100% of the work
- Produce results you can trust

---

## Critical Rules

### FORBIDDEN:
- NO scripts for bulk processing (sed, awk, perl, python one-liners)
- NO complex regex that could miss edge cases
- NO assumptions about data format or patterns
- NO "good enough" - it's 100% complete or not done
- NO rushing - take the time needed
- NO batch operations without verification

### REQUIRED:
- Manual processing - line by line, record by record
- Explicit verification - check each transformation
- Detailed reporting - progress updates with counts
- Complete work - process ALL data, not just samples
- Error documentation - report any issues found
- Final validation - verify output is 100% correct

---

## Workflow

### Phase 1: UNDERSTAND

Before touching any data:

1. **Read source file(s) completely**
   - How many lines/records?
   - What's the format?
   - Any inconsistencies or encoding issues?

2. **Understand requirements EXACTLY**
   - What data to extract?
   - What format for output?
   - How to handle missing data?

3. **Create processing plan**
   - Step-by-step approach
   - How to verify each step
   - What to do with edge cases

### Phase 2: PROCESS (Line by Line)

For EVERY single record:

1. **Read** - Show the raw line/record
2. **Extract/Transform** - Manually identify each field
3. **Verify** - Check extracted data is correct
4. **Document** - Add to output, report progress

### Phase 3: VERIFY Output

After processing all records:

1. **Count verification** - Input records = Output records?
2. **Spot check samples** - First, last, random middle records
3. **Format validation** - Headers, delimiters, quotes correct?
4. **Completeness check** - All required fields present?

### Phase 4: REPORT

Provide detailed completion report with:
- Input file details
- Processing method and duration
- Output file details
- Issues found and excluded records
- Quality assurance checklist

---

## When to Use This Skill

### Perfect for:
- Converting unstructured text to CSV/Excel
- Comparing two datasets manually
- Filling missing data from multiple sources
- Data cleaning that requires judgment
- Merging information from different formats
- Tasks where you need 100% confidence
- Processing sensitive or critical data
- When previous automation failed

### Do NOT use for:
- Simple file operations (copy, move)
- Tasks needing automation (millions of records)
- Time-critical tasks where reliability isn't critical
- Code generation or refactoring

---

## Reference Files

For detailed workflows and examples:

- `references/workflows.md` - Task-specific processing workflows
- `references/reporting.md` - Progress and completion report formats

---

## Progress Reporting

Report progress regularly (every 10-50 records):

```
Progress Update:
- Processed: 50/250 records (20%)
- Issues found: 2 records with malformed data (documented)
- Status: On track
```

---

## Error Handling

When encountering problematic data:

1. **Document it** - Show raw data, problem, options
2. **Don't assume** - Never guess what user wants
3. **Continue or ask** - Minor issues: document and continue. Major issues: stop and ask.

---

## Quality Commitment

When using this skill, you get:

- **Reliability**: Every record processed manually
- **Transparency**: See every step
- **Completeness**: 100% or documented exclusions
- **Trust**: No hidden assumptions or shortcuts
- **Quality**: Verified output you can rely on

**Motto**: "Measure twice, cut once. Then verify again."
