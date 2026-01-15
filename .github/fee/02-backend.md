# Fee Module – Backend (Step 1)

Implement backend in this order:

1. FeeStructure

   - classId
   - academicYearId

2. FeeItem

   - name
   - amount
   - frequency

3. StudentFee
   - studentClassId
   - totalAmount
   - paidAmount

Rules:

- ADMIN only can create/update
- STUDENT/PARENT read-only
- Teachers blocked entirely
