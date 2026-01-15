# Fee Module User Manual

This manual guides school administrators, students, and parents on using the Fee Module in the School Management System.

---

## Table of Contents

1. [Overview](#overview)
2. [For Administrators](#for-administrators)
   - [Fee Types](#1-fee-types)
   - [Fee Structures](#2-fee-structures)
   - [Fee Payments](#3-fee-payments)
3. [For Students](#for-students)
4. [For Parents](#for-parents)
5. [Workflow Summary](#workflow-summary)
6. [FAQ](#faq)

---

## Overview

The Fee Module handles basic fee collection and tracking for the school. It supports:

- **Fee Types**: Categories of fees (Tuition, Lab, Sports, etc.)
- **Fee Structures**: Amount per fee type for each class and academic year
- **Fee Payments**: Tracking what each student owes and has paid

**Currency**: All amounts are in Nepalese Rupees (NRs.)

---

## For Administrators

### 1. Fee Types

**Location**: Dashboard → Fees → Fee Types

Fee Types are categories of fees that the school collects. Examples:

- Tuition Fee
- Lab Fee
- Sports Fee
- Library Fee
- Computer Fee

#### Creating a Fee Type

1. Click the **"+ New Fee Type"** button
2. Fill in:
   - **Name** (required): The fee category name (e.g., "Tuition Fee")
   - **Description** (optional): Additional details about this fee
3. Click **"Save"**

#### Editing a Fee Type

1. Find the fee type in the list
2. Click the **Edit** (pencil) icon
3. Update the name or description
4. Click **"Update"**

#### Deleting a Fee Type

1. Find the fee type in the list
2. Click the **Delete** (trash) icon
3. Confirm deletion

> ⚠️ **Note**: You cannot delete a fee type that has fee structures assigned to it. Remove the structures first.

---

### 2. Fee Structures

**Location**: Dashboard → Fees → Fee Structures

Fee Structures define how much each fee type costs for a specific class in a specific academic year.

#### Understanding Fee Structures

| Field         | Description                 |
| ------------- | --------------------------- |
| Fee Type      | Which category of fee       |
| Class         | Which class this applies to |
| Academic Year | Which academic year         |
| Amount        | The fee amount in NRs.      |

#### Creating Fee Structures

**Option A: Single Fee Structure**

1. Click **"+ New Structure"**
2. Select the **Fee Type**
3. Select the **Class**
4. Select the **Academic Year**
5. Enter the **Amount**
6. Click **"Save"**

**Option B: Bulk Create (Recommended)**

Use this to create the same fee for multiple classes at once.

1. Click **"Bulk Create"**
2. Select the **Fee Type** (e.g., Tuition Fee)
3. Select **multiple classes** (hold Ctrl/Cmd to multi-select)
4. Select the **Academic Year**
5. Enter the **Amount** (same for all selected classes)
6. Click **"Create Structures"**

#### Example: Setting Up Fees for New Academic Year

Let's say you want to set up fees for Academic Year 2081-2082:

1. **Tuition Fee**: NRs. 50,000 for all classes

   - Click "Bulk Create"
   - Select "Tuition Fee"
   - Select all classes (Class 1-10)
   - Select "2081-2082"
   - Enter "50000"
   - Click Create

2. **Lab Fee**: NRs. 5,000 for Class 9 and 10 only

   - Click "Bulk Create"
   - Select "Lab Fee"
   - Select Class 9 and Class 10
   - Select "2081-2082"
   - Enter "5000"
   - Click Create

3. **Computer Fee**: NRs. 3,000 for Class 6-10
   - Repeat the process for Class 6 to 10

#### Filtering Fee Structures

Use the filters at the top to view specific structures:

- **Class**: Show structures for one class only
- **Academic Year**: Show structures for one year only

#### Viewing Total Fees

The **Summary Cards** at the top show:

- **Total Structures**: Number of fee structure records
- **Total Fees**: Sum of all displayed fee amounts

---

### 3. Fee Payments

**Location**: Dashboard → Fees → Fee Payments

This is where you manage student fee records and collect payments.

#### Understanding Payment Status

| Status  | Color  | Meaning                             |
| ------- | ------ | ----------------------------------- |
| PENDING | Yellow | No payment made yet                 |
| PARTIAL | Blue   | Some amount paid, balance remaining |
| PAID    | Green  | Fully paid                          |

#### Step 1: Generate Fee Records

Before collecting payments, you must generate fee records for students.

**Option A: Generate for One Student**

1. Click **"Generate Fees"**
2. Select **"Single Student"** tab
3. Search and select the student
4. Click **"Generate Fees"**

This creates payment records for all fee structures applicable to that student's class.

**Option B: Generate for Entire Class (Recommended)**

1. Click **"Generate Fees"**
2. Select **"Bulk Generate"** tab
3. Select the **Class**
4. Select the **Academic Year**
5. Click **"Generate for Class"**

This creates payment records for all students enrolled in that class.

#### Step 2: View and Filter Payments

Use the filters to find specific payments:

- **Class**: Filter by class
- **Status**: Filter by PENDING, PARTIAL, or PAID
- **Search**: Search by student name or roll number

#### Step 3: Record a Payment

1. Find the student's fee record in the list
2. Click the **"Pay"** button (green icon)
3. In the popup:
   - Review the fee details (student name, fee type, class)
   - See **Amount Due** and **Amount Paid** so far
   - Enter the **Amount to Pay**
4. Click **"Record Payment"**

> 💡 **Tip**: You can make partial payments. The status will change to PARTIAL until the full amount is paid.

#### Understanding the Summary Cards

| Card          | Description                              |
| ------------- | ---------------------------------------- |
| Total Records | Number of fee payment records            |
| Pending       | Count of records with no payment         |
| Partial       | Count of records with incomplete payment |
| Paid          | Count of fully paid records              |

---

## For Students

**Location**: Dashboard → Fees

Students can view their own fee status but cannot make payments (payments are recorded by admin only).

### What You'll See

1. **Summary Cards**:

   - Total Fees Due
   - Total Paid
   - Remaining Balance
   - Number of Pending/Partial/Paid items

2. **Fee List**: All your fee records showing:
   - Fee Type (Tuition, Lab, etc.)
   - Amount Due
   - Amount Paid
   - Status

### Status Meanings

- **PENDING** (Yellow): You haven't made any payment yet
- **PARTIAL** (Blue): You've paid some amount, more is due
- **PAID** (Green): This fee is fully paid

> 📝 **Note**: Contact your school's accounts office to make fee payments.

---

## For Parents

**Location**: Dashboard → Fees

Parents can view fee status for all their registered children.

### Selecting a Child

If you have multiple children in the school:

1. Use the **dropdown menu** at the top to select which child's fees to view
2. The page will update to show that child's fee records

### What You'll See

Same as the student view:

- Summary of total fees, paid amounts, and balance
- List of all fee records with status

---

## Workflow Summary

Here's the recommended workflow for each academic year:

```
┌─────────────────────────────────────────────────────────────┐
│                    START OF ACADEMIC YEAR                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: CREATE FEE TYPES (if not already created)          │
│  ─────────────────────────────────────────────────────────  │
│  Go to: Fees → Fee Types                                     │
│  Create: Tuition Fee, Lab Fee, Sports Fee, etc.              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: CREATE FEE STRUCTURES                               │
│  ─────────────────────────────────────────────────────────  │
│  Go to: Fees → Fee Structures                                │
│  Use "Bulk Create" to set amounts for each class             │
│  Example: Tuition = NRs. 50,000 for Class 1-10               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: GENERATE FEE RECORDS FOR STUDENTS                   │
│  ─────────────────────────────────────────────────────────  │
│  Go to: Fees → Fee Payments                                  │
│  Click "Generate Fees" → "Bulk Generate"                     │
│  Select each class and generate                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: COLLECT PAYMENTS (throughout the year)              │
│  ─────────────────────────────────────────────────────────  │
│  Go to: Fees → Fee Payments                                  │
│  Find student, click "Pay", enter amount                     │
│  Repeat as students make payments                            │
└─────────────────────────────────────────────────────────────┘
```

### Quick Reference

| Task                  | Location              | Button         |
| --------------------- | --------------------- | -------------- |
| Add fee category      | Fees → Fee Types      | + New Fee Type |
| Set fee amounts       | Fees → Fee Structures | Bulk Create    |
| Generate student fees | Fees → Fee Payments   | Generate Fees  |
| Record payment        | Fees → Fee Payments   | Pay (on row)   |

---

## FAQ

### Q: When should I generate fees?

**A**: Generate fees after:

1. Setting up fee structures for the academic year
2. Students are enrolled in their classes

Best practice: Generate for entire class at once using "Bulk Generate"

### Q: Can I modify a fee amount after generating payments?

**A**: No. Once payments exist for a fee structure, the amount cannot be changed. This prevents accounting discrepancies. If you need to change amounts:

1. For the current year: Contact technical support
2. For next year: Create new structures with correct amounts

### Q: What if a student joins mid-year?

**A**:

1. Enroll the student in their class first
2. Go to Fee Payments → Generate Fees
3. Use "Single Student" tab to generate fees for just that student

### Q: Can students/parents pay online?

**A**: No, this version supports offline payment tracking only. The admin records payments made at the school office.

### Q: How do I see who hasn't paid?

**A**:

1. Go to Fee Payments
2. Use the Status filter → Select "PENDING"
3. This shows all students who haven't made any payment

### Q: How do I generate a fee report?

**A**: Use the filters to select a class and academic year, then the summary cards show totals. For detailed reports, contact technical support for custom report generation.

### Q: What if I accidentally record wrong payment?

**A**: Contact technical support. Payment corrections require database-level changes to maintain audit trail.

### Q: Can I delete a fee record?

**A**: Fee payment records cannot be deleted through the UI to maintain financial records integrity. Contact technical support if absolutely necessary.

---

## Support

For technical issues or feature requests, contact your system administrator or technical support team.

---

_Last Updated: January 2025_
_Fee Module Version: 1.0 (Level 1 - Basic Fee Collection)_
