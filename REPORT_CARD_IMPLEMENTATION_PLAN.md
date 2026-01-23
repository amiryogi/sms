# Report Card (Grade Sheet) Implementation Plan

## Reference: Attached Grade Sheet from Kavre English Secondary School

---

## Current vs Required Format Comparison

### Current Format (Column-based)
```
| S.N | Subject | Theory(FM) |   | Practical(FM) |   | Total | Grade | GPA | Remarks |
|     |         | Obt. | Gr. | Obt.    | Gr. |       |       |     |         |
```

### Required Format (Row-based - as per attached image)
```
| S.N | SUBJECTS                        | CREDIT HOUR | GRADE POINT | GRADE | FINAL GRADE | REMARKS     |
|     |                                 | (CH)        | (GP)        |       | (FG)        |             |
|-----|--------------------------------|-------------|-------------|-------|-------------|-------------|
| 1   | C. ENGLISH (TH)                | 3.75        | 3.6         | A     | A+          | OUTSTANDING |
|     | C. ENGLISH (IN)                | 1.25        | 4.0         | A+    |             |             |
| 2   | अनिवार्य नेपाली (TH)              | 3.75        | 2.8         | B     | B+          | VERY GOOD   |
|     | अनिवार्य नेपाली (IN)              | 1.25        | 3.6         | A     |             |             |
```

---

## Key Differences Identified

| Aspect | Current | Required |
|--------|---------|----------|
| **Structure** | Theory & Practical as columns | Theory (TH) & Internal (IN) as separate rows |
| **Data Shown** | Marks obtained, Full marks | Credit Hours, Grade Point, Grade only |
| **Subject Display** | Single row per subject | Two rows per subject (TH + IN) |
| **Final Grade** | Per-subject column | Merged cell spanning TH+IN rows |
| **Remarks** | Per-subject | Merged cell with descriptive text (OUTSTANDING, VERY GOOD, etc.) |
| **Footer** | Percentage, GPA | Total Credit Hours, GPA, Attendance |

---

## Implementation Tasks

### Phase 1: Update Student Info Section
- [x] Current: Student Name, Roll No, Class, Section
- [ ] Required: Add more fields matching the grade sheet:
  - THE GRADE(S) SECURED BY: (Student Name)
  - DATE OF BIRTH: (BS date) | B.S. | (AD date) | A.D. | IEMIS NO.:
  - ROLL NO: | GRADE: | SECTION: | SYMBOL NO.:
  - IN THE (Exam Name) CONDUCTED IN (Year BS) B.S. (Year AD) A.D. ARE GIVEN BELOW:

### Phase 2: Restructure Marks Table
- [ ] Change table structure from column-based to row-based
- [ ] New columns: S.N | SUBJECTS | CREDIT HOUR (CH) | GRADE POINT (GP) | GRADE | FINAL GRADE (FG) | REMARKS
- [ ] Each subject renders 2 rows:
  - Row 1: Subject Name (TH) - Theory
  - Row 2: Subject Name (IN) - Internal/Practical
- [ ] Final Grade and Remarks span both rows (rowSpan=2)
- [ ] S.N only on first row of each subject

### Phase 3: Update Table Footer
- [ ] Remove marks-based totals
- [ ] Add: TOTAL | {totalCreditHours} | GRADE POINT AVERAGE (GPA): {gpa}

### Phase 4: Add Attendance Section
- [ ] New section after table: ATTENDANCE: {present}/{total}
- [ ] REMARKS: {remarkText} (EXCELLENT, VERY GOOD, etc.)

### Phase 5: Add Additional Personal Evaluation Section (Optional)
- [ ] Grid layout with evaluation items:
  - HANDWRITING | Grade
  - PARTICIPATION IN EXTRA | Grade
  - DISCIPLINE | Grade
  - ENGLISH PROFICIENCY | Grade

### Phase 6: Update Signature Section
- [ ] Change labels:
  - CLASS TEACHER (left)
  - EXAM CO-ORDINATOR (center)
  - PRINCIPAL (right)
- [ ] Add: Date of Issue: {date in BS format}

### Phase 7: Update Footer
- [ ] Add school contact info at bottom:
  - Ph: {landline}, {phone}, Email: {email}, Notice Board No. {number}

---

## Data Requirements from Backend

### Current API Response (subjects array item):
```javascript
{
  subjectId, subjectName, subjectCode,
  creditHours,                    // Total credit hours from ClassSubject
  theoryCreditHours,              // Currently calculated as 75% of total
  internalCreditHours,            // Currently calculated as 25% of total
  theoryMarks, theoryFullMarks, theoryGrade, theoryGpa,
  practicalMarks, practicalFullMarks, practicalGrade, practicalGpa,
  totalMarks, totalFullMarks, finalGrade, finalGpa,
  isPassed, isAbsent, remark
}
```

### Database Schema Analysis:

**For Grade 1-10 (`ClassSubject` model):**
- `creditHours` - Single total value (e.g., 5.0)
- `theoryMarks` - Full marks for theory (e.g., 75)
- `practicalMarks` - Full marks for practical/internal (e.g., 25)
- ❌ NO separate `theoryCreditHours` / `practicalCreditHours` fields

**For Grade 11-12 (`SubjectComponent` model):**
- Has separate `creditHours` per component type (THEORY/PRACTICAL)

### Option 1: Add fields to ClassSubject (Recommended)
Add `theoryCreditHours` and `practicalCreditHours` to `ClassSubject` model:
```prisma
model ClassSubject {
  // ... existing fields
  theoryCreditHours    Decimal?  @map("theory_credit_hours") @db.Decimal(4, 2)
  practicalCreditHours Decimal?  @map("practical_credit_hours") @db.Decimal(4, 2)
}
```

### Option 2: Use existing data and calculate (Current approach)
- Theory CH = 75% of total
- Practical CH = 25% of total

### Required Data (after fix):
- ✅ `theoryCreditHours` - From `ClassSubject.theoryCreditHours` or `SubjectComponent`
- ✅ `practicalCreditHours` - From `ClassSubject.practicalCreditHours` or `SubjectComponent`
- ✅ `theoryGpa` (Grade Point for theory)
- ✅ `practicalGpa` (Grade Point for internal/practical)
- ✅ `theoryGrade`
- ✅ `practicalGrade`
- ✅ `finalGrade`
- 🔧 `remarkText` - Need mapping: A+ → OUTSTANDING, A/B+ → VERY GOOD, etc.

### Attendance Data (may need backend update):
- `attendancePresent` - Days present
- `attendanceTotal` - Total school days

---

## Remark Mapping Logic

```javascript
const getRemarkText = (grade) => {
  const remarks = {
    'A+': 'OUTSTANDING',
    'A': 'EXCELLENT',
    'B+': 'VERY GOOD',
    'B': 'GOOD',
    'C+': 'SATISFACTORY',
    'C': 'ACCEPTABLE',
    'D': 'PARTIALLY ACCEPTABLE',
    'NG': 'NOT GRADED'
  };
  return remarks[grade] || '';
};
```

---

## Credit Hour Logic

### Current Database State:
- **Grade 1-10**: `ClassSubject` has only `creditHours` (total)
- **Grade 11-12**: `SubjectComponent` has `creditHours` per THEORY/PRACTICAL

### Recommended Fix: Add Schema Fields for Grade 1-10

Add to `ClassSubject` model in `schema.prisma`:
```prisma
theoryCreditHours    Decimal?  @default(0) @map("theory_credit_hours") @db.Decimal(4, 2)
practicalCreditHours Decimal?  @default(0) @map("practical_credit_hours") @db.Decimal(4, 2)
```

Then:
1. Run `npx prisma migrate dev --name add_credit_hour_split`
2. Update seed/admin UI to set these values per subject
3. Update `buildSubjectResults()` in `reportCard.controller.js` to read from DB

### API Response Update:
```javascript
// In buildSubjectResults():
theoryCreditHours: parseFloat(classSubject.theoryCreditHours) || 0,
practicalCreditHours: parseFloat(classSubject.practicalCreditHours) || 0,
// OR for NEB classes:
theoryCreditHours: theoryComponent?.creditHours || 0,
practicalCreditHours: practicalComponent?.creditHours || 0,
```

---

## Component Structure (New)

```jsx
<NepalReportCard>
  ├── Header (School Logo, Name, Address, Contact)
  ├── Report Title (Exam Name, Year)
  ├── Student Info Section (Grid with DOB, Roll, Grade, Section, Symbol No)
  ├── Grades Table
  │   ├── thead (S.N, SUBJECTS, CH, GP, GRADE, FG, REMARKS)
  │   ├── tbody (Each subject = 2 rows: TH + IN)
  │   └── tfoot (TOTAL, Total CH, GPA)
  ├── Attendance & Remarks Row
  ├── Additional Personal Evaluation (Optional grid)
  ├── Signature Section (3 columns)
  ├── Date of Issue
  └── Footer (Contact info)
</NepalReportCard>
```

---

## Files to Modify

### 1. Schema Update (Required First)
**`backend/prisma/schema.prisma`**
- Add `theoryCreditHours` and `practicalCreditHours` to `ClassSubject` model

### 2. Backend Changes
**`backend/src/controllers/reportCard.controller.js`**
- Update `buildSubjectResults()` to read credit hours from DB instead of calculating
- Remove hardcoded 75/25 split calculation

**`backend/src/controllers/classSubject.controller.js`** (if exists)
- Update create/update to accept new credit hour fields

### 3. Frontend Changes
**`frontend/src/components/common/NepalReportCard.jsx`**
- Complete restructure of table (row-based TH/IN format)
- Update student info section
- Add attendance section
- Update signature labels
- Update CSS styles

**`frontend/src/pages/admin/ClassSubjects.jsx`** (if exists)
- Add fields for entering theory/practical credit hours

---

## Priority Order

1. 🔴 **CRITICAL**: Add `theoryCreditHours` / `practicalCreditHours` to schema
2. 🔴 **CRITICAL**: Update backend to read credit hours from DB
3. ✅ **HIGH**: Restructure table to row-based format (TH/IN rows)
4. ✅ **HIGH**: Update columns (CH, GP, Grade, FG, Remarks)
5. **MEDIUM**: Update student info section format
6. **MEDIUM**: Add attendance section
7. **LOW**: Add Additional Personal Evaluation section
8. **LOW**: Style refinements

---

## Estimated Effort

| Task | Effort |
|------|--------|
| Schema migration | 15 mins |
| Backend controller update | 30 mins |
| Table restructure (frontend) | 1-2 hours |
| Student info update | 30 mins |
| Attendance section | 30 mins |
| CSS updates | 1 hour |
| Testing & fixes | 1 hour |
| **Total** | **5-6 hours** |

---

## Next Steps

1. ✅ Review and approve this plan
2. **Step 1**: Add schema fields for credit hour split (migration)
3. **Step 2**: Update backend `buildSubjectResults()` to use DB values
4. **Step 3**: Update admin UI for Class Subjects to enter TH/IN credit hours
5. **Step 4**: Enter actual credit hour data for Grade 10 subjects
6. **Step 5**: Restructure frontend table (NepalReportCard.jsx)
7. Test with actual Grade 10 data
8. Iterate based on feedback

---

## Decision Required

**Do you want to:**
- **Option A**: Add `theoryCreditHours` / `practicalCreditHours` fields to `ClassSubject` schema (allows admin to set exact values per subject)
- **Option B**: Continue using calculated 75/25 split (simpler, but less flexible)

Please confirm before I proceed with implementation.
