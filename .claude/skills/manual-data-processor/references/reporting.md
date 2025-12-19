# Progress and Completion Report Formats

## Progress Updates

Report progress regularly (every 10-50 records depending on total):

```markdown
Progress Update:
- Processed: 50/250 records (20%)
- Time elapsed: ~15 minutes
- Estimated remaining: ~45 minutes
- Issues found: 2 records with malformed data (documented)
- Status: On track
```

---

## Completion Report Template

```markdown
## Data Processing Complete

### Input
- File: products.txt
- Total records: 250
- Format: Unstructured text

### Processing
- Method: Manual line-by-line extraction
- Duration: ~45 minutes
- Issues found: 3 records with missing price (documented)

### Output
- File: products.csv
- Total records: 247 (3 excluded due to missing data)
- Format: CSV with headers
- Columns: Product Name, Price, Category

### Verification
- All 247 records processed
- No data truncation
- Format validated
- Spot-checked 10 random records

### Excluded Records (3)
- Line 45: "Product: Widget A Category: Tools" - No price found
- Line 128: "Product: Gadget B Price: TBD Category: Electronics" - Invalid price
- Line 203: "Product: Item C Price: Call for quote Category: Services" - Invalid price

### Quality Assurance
- 100% of processable data extracted
- No assumptions made
- All exclusions documented
- Output validated

Ready for your review.
```

---

## Issue Documentation Format

When encountering problematic data:

```markdown
Issue at line 45:
Raw data: "Product: Widget X Price: N/A Category: Tools"
Problem: Price is "N/A", not a number

Options:
  a) Skip this record
  b) Set price to 0
  c) Leave as "N/A"
  d) Ask user for guidance

Recommendation: Ask user before proceeding
```

---

## Pre-Completion Checklist

Before marking task complete:

- [ ] Processed 100% of records (or documented exclusions)
- [ ] Verified output format is correct
- [ ] Counted input vs output records
- [ ] Spot-checked random samples
- [ ] Documented any issues or exclusions
- [ ] Created detailed completion report
- [ ] No assumptions made without documentation
- [ ] Output file is properly formatted
- [ ] All transformations verified

**Only mark complete when ALL boxes checked.**

---

## Communication Style

### Show Your Work
```
Reading products.txt...
- File has 250 lines
- Format appears to be: "Product: [name] Price: [price] Category: [category]"
- No header row detected

Starting line-by-line processing...

Line 1: "Product: Laptop Model X Price: $1,299.99 Category: Electronics"
-> Extracted: "Laptop Model X", "1299.99", "Electronics"
-> Verified

Line 2: "Product: Mouse Wireless Price: $29.99 Category: Accessories"
-> Extracted: "Mouse Wireless", "29.99", "Accessories"
-> Verified

...

[Progress updates every 25 records]

...

Line 250: "Product: Monitor 4K Price: $599.99 Category: Electronics"
-> Extracted: "Monitor 4K", "599.99", "Electronics"
-> Verified

Processing complete. Generating report...
```

### Give Estimates
```
Task: Convert 1,000 records from TXT to CSV
Estimated time: ~1.5 hours (manual processing)
I'll provide progress updates every 100 records.

Is this acceptable? If you need it done faster, I can suggest a
different approach, though it may be less reliable.
```

### Be Honest About Limitations
```
Note: I found 15 records with ambiguous formatting that don't
match the common pattern. I'll need your guidance on how to handle
these before I can complete the task 100%.

Would you like me to:
1. Show you these 15 records and get instructions for each?
2. Set them aside in a separate file for manual review?
3. Make my best judgment and document my decisions?
```
