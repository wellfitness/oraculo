# Task-Specific Processing Workflows

## 1. Extract Data from Text Files

**Task**: Convert unstructured text to structured format (CSV, JSON, etc.)

### Approach
1. Read entire file
2. Identify pattern for each record (but don't rely on regex)
3. For each line:
   - Manually identify fields
   - Extract values explicitly
   - Clean and normalize
   - Add to output
4. Verify count matches

### Example
```
Line 1: "Product: Laptop Model X Price: $1,299.99 Category: Electronics"

Extract:
- Product Name: "Laptop Model X"
- Price: "1299.99" (removed $ and comma)
- Category: "Electronics"

Verify:
- Product name is complete
- Price is numeric
- Category is present

Add to CSV:
"Laptop Model X",1299.99,"Electronics"

Progress: 1/50 records processed
```

---

## 2. Compare Two Documents

**Task**: Find differences, matches, or merge data from multiple sources

### Approach
1. Load both files
2. Identify matching criteria (ID, name, email, etc.)
3. For each record in File A:
   - Search manually in File B
   - Compare relevant fields
   - Document differences
   - Merge if needed
4. Identify records only in A or only in B
5. Create comprehensive report

### Example
```
Comparing customers_old.csv vs customers_new.csv

Record 1 (old): John Smith, john@email.com, 555-1234, null
Record 1 (new): John Smith, john@email.com, 555-5678, "123 Main St"

Comparison:
- Name: Match
- Email: Match
- Phone: Different (555-1234 -> 555-5678)
- Address: Added in new (was null)

Merged: John Smith, john@email.com, 555-5678, "123 Main St"
Decision: Use new phone (more recent), add address

Progress: 1/500 customers compared
```

---

## 3. Fill Missing Data

**Task**: Complete information in one file using data from another

### Approach
1. Identify which file is the "master" (to be completed)
2. Identify which file has supplementary data
3. Determine matching criteria
4. For each record with missing data:
   - Search for match in supplementary file
   - Verify it's the correct match
   - Copy missing fields
   - Document the fill
5. Report how many fields were filled

### Example
```
Master: employees.csv (has: Name, Email, missing: Phone, Department)
Source: hr_database.csv (has: Name, Phone, Department)

Employee 1 in master: "Alice Johnson", "alice@company.com", null, null

Searching in hr_database.csv...
Found: "Alice Johnson", "555-0123", "Engineering"

Verification:
- Name matches exactly
- Source is reliable

Filling:
- Phone: null -> "555-0123"
- Department: null -> "Engineering"

Result: "Alice Johnson", "alice@company.com", "555-0123", "Engineering"

Progress: 1/150 employees processed, 2 fields filled
```

---

## 4. Data Cleaning

**Task**: Remove duplicates, fix formatting, normalize values

### Approach
1. Read all data
2. For each record:
   - Identify issues (format, casing, extra spaces, etc.)
   - Clean manually
   - Verify cleaned version is correct
   - Document transformation
3. Check for duplicates manually
4. Create clean output

### Example
```
Original: "  JOHN SMITH  ", "john@EMAIL.com ", " 555-1234"

Cleaning:
1. Trim whitespace: "JOHN SMITH", "john@EMAIL.com", "555-1234"
2. Normalize name: "John Smith"
3. Normalize email: "john@email.com"
4. Normalize phone: "555-1234"

Result: "John Smith", "john@email.com", "555-1234"

Progress: 1/200 records cleaned
```

---

## 5. Format Conversion

**Task**: Convert between formats (CSV to JSON, TXT to Excel, etc.)

### Approach
1. Read source format
2. Understand target format requirements
3. For each record:
   - Extract all fields
   - Format for target
   - Verify no data loss
   - Add to output
4. Ensure proper encoding and structure

### CSV to JSON Example
```
CSV Line: "John Smith","john@email.com","555-1234"

JSON Object:
{
  "name": "John Smith",
  "email": "john@email.com",
  "phone": "555-1234"
}

Verification:
- All fields present
- JSON syntax valid
- No data truncation

Progress: 1/100 records converted
```

---

## Common Pitfalls to Avoid

### DON'T:
- Use grep/sed/awk for bulk extraction
- Assume all records follow same pattern
- Skip records that look problematic
- Guess at ambiguous data
- Rush to finish faster

### DO:
- Read each line individually
- Handle variations explicitly
- Document any anomalies
- Ask when uncertain
- Take time to verify
