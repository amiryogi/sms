# 🔍 K-12 School Management System - Security & RBAC Audit Report

**Date:** Generated on audit  
**Auditor:** Senior System Maintainer  
**Scope:** Backend RBAC enforcement, data access patterns, security vulnerabilities

---

## 📋 Executive Summary

The system has a **solid RBAC foundation** with comprehensive middleware for authentication, authorization, and ownership checks. However, several **critical security gaps** were identified that could lead to:

- ❌ **Cross-school data leakage** (multi-school isolation failures)
- ❌ **Permission bypass** (route permission names don't match seed permissions)
- ⚠️ **Incomplete academic year scoping** in some queries
- ⚠️ **Missing school-level filters** in critical controllers

**Overall Security Score: 6.5/10** (Good foundation, needs fixes)

---

## 🔴 CRITICAL ISSUES

### 1. Permission Name Mismatch (Routes vs Seed)

**Severity:** 🔴 **CRITICAL**  
**Impact:** All permission checks are failing silently - routes are effectively unprotected

**Problem:**
Routes use permission names that don't exist in the database:

| Route File | Used Permission | Actual Permission (Seed) |
|------------|----------------|--------------------------|
| `attendance.routes.js` | `attendance:view` | `attendance.view_all`, `attendance.view_own`, `attendance.view_class` |
| `attendance.routes.js` | `attendance:mark` | `attendance.mark` ✅ |
| `result.routes.js` | `results:enter` | `result.enter` |
| `result.routes.js` | `results:view` | `result.view_all`, `result.view_own`, `result.view_child` |

**Evidence:**
```javascript
// backend/src/routes/attendance.routes.js:27
authorize('attendance:view')  // ❌ This permission doesn't exist!

// backend/prisma/seed.js:43-45
{ name: 'attendance.view_all', ... }  // ✅ Actual permission
{ name: 'attendance.view_own', ... }
{ name: 'attendance.view_class', ... }
```

**Fix Required:**
- Update all route files to use correct permission names (dot notation, not colon)
- OR update seed.js to match route expectations
- **Recommendation:** Use dot notation (`attendance.view_all`) as it's more granular

---

### 2. Missing School-Level Data Isolation

**Severity:** 🔴 **CRITICAL**  
**Impact:** Users from one school could potentially access data from another school

#### 2.1 Attendance Controller - No School Filter

**File:** `backend/src/controllers/attendance.controller.js`

**Issues:**
- `getAttendance()` (line 9): Queries `studentClass` without `schoolId` filter
- `markAttendance()` (line 72): No validation that students belong to user's school
- `getStudentAttendanceSummary()` (line 125): No school-level check

**Risk:** A teacher from School A could mark attendance for students from School B if they know the IDs.

**Example Vulnerable Query:**
```javascript
// Line 32 - Missing schoolId filter
const enrollments = await prisma.studentClass.findMany({
  where: studentWhere,  // ❌ No schoolId check!
  // ...
});
```

**Fix Required:**
```javascript
const enrollments = await prisma.studentClass.findMany({
  where: {
    ...studentWhere,
    student: {
      user: {
        schoolId: req.user.schoolId  // ✅ Add school filter
      }
    }
  },
  // ...
});
```

#### 2.2 Assignment Controller - No School Filter

**File:** `backend/src/controllers/assignment.controller.js`

**Issues:**
- `getAssignments()` (line 9): No explicit `schoolId` filter
- `getAssignment()` (line 56): No school-level validation
- Relies on `teacherSubject.userId` filter, but doesn't verify school

**Risk:** Cross-school assignment access if teacher IDs overlap (unlikely but possible).

**Fix Required:**
Add school-level validation via `teacherSubject.classSubject.class.schoolId` or similar.

#### 2.3 Result Controller - Partial School Filter

**File:** `backend/src/controllers/result.controller.js`

**Status:** ✅ Partially protected
- `getStudentExamResults()` (line 140): Has `schoolId` check ✅
- `getResultsBySubject()` (line 9): Missing school-level validation
- `saveResults()` (line 68): No school filter on exam subject lookup

---

### 3. Academic Year Scoping Gaps

**Severity:** 🟡 **MEDIUM**  
**Impact:** Data from wrong academic years could be accessed

**Issues Found:**

1. **Attendance Controller:**
   - `getAttendance()` (line 23): Academic year is optional - defaults to current, but no validation
   - Should enforce academic year scoping more strictly

2. **Result Controller:**
   - `getResultsBySubject()` (line 29): Uses `examSubject.classSubject.academicYearId` ✅ (Good)
   - But doesn't validate that academic year belongs to user's school

**Recommendation:**
Add explicit academic year validation middleware or enforce in all queries.

---

## 🟡 MEDIUM PRIORITY ISSUES

### 4. Inconsistent Permission Granularity

**Issue:** Some routes use generic permissions where granular ones exist.

**Example:**
- Route uses: `authorize('attendance:view')`
- Available: `attendance.view_all`, `attendance.view_own`, `attendance.view_class`

**Recommendation:**
- Teachers should use `attendance.view_class` (only their classes)
- Students should use `attendance.view_own` (only their own)
- Admins should use `attendance.view_all` (everything)

---

### 5. Missing Assignment Validation in Routes

**File:** `backend/src/routes/assignment.routes.js`

**Issue:**
- Routes use `isTeacher` middleware but don't validate teacher assignments
- Controller validates (line 92-98), but should be in middleware for consistency

**Current Flow:**
```
Route → isTeacher → Controller validates assignment
```

**Better Flow:**
```
Route → isTeacher → canAccessAssignment → Controller
```

---

### 6. Exam Controller - Missing School Filter in Some Queries

**File:** `backend/src/controllers/exam.controller.js`

**Issues:**
- `publishExam()` (line 164): Updates exam without checking `schoolId` first
- `updateExamSubjects()` (line 114): Validates exam exists and belongs to school ✅ (Good)
- `deleteExam()` (line 180): Has school check ✅ (Good)

**Fix Required:**
Add school validation to `publishExam()`.

---

## ✅ STRENGTHS IDENTIFIED

### 1. Excellent Middleware Architecture

**Files:** `ownership.middleware.js`, `context.middleware.js`, `authorize.middleware.js`

**Strengths:**
- ✅ Comprehensive ownership checks (`isAssignedTeacher`, `canAccessSubject`, etc.)
- ✅ Teacher assignment validation via `teacher_subjects` table
- ✅ Context loading for teachers, students, parents
- ✅ School scope middleware available (though not always used)

### 2. Good Student Controller Implementation

**File:** `backend/src/controllers/student.controller.js`

**Strengths:**
- ✅ Proper school-level filtering (line 30: `schoolId: req.user.schoolId`)
- ✅ Academic year scoping
- ✅ Proper enrollment validation

### 3. Solid Exam Controller

**File:** `backend/src/controllers/exam.controller.js`

**Strengths:**
- ✅ Most queries include `schoolId: req.user.schoolId`
- ✅ Proper academic year scoping
- ✅ Good validation before operations

### 4. Well-Structured RBAC System

**Strengths:**
- ✅ Permission-based access control (not just role-based)
- ✅ Granular permissions defined in seed
- ✅ Multi-role support per user
- ✅ Proper JWT authentication with refresh tokens

---

## 📝 DETAILED FINDINGS BY MODULE

### Attendance Module

| Endpoint | Permission Check | School Filter | Academic Year | Teacher Assignment | Status |
|----------|------------------|---------------|---------------|-------------------|--------|
| `GET /attendance` | ❌ Wrong name | ❌ Missing | ⚠️ Optional | ✅ Middleware | 🔴 **FAIL** |
| `POST /attendance` | ❌ Wrong name | ❌ Missing | ⚠️ Optional | ✅ Middleware | 🔴 **FAIL** |
| `GET /attendance/student/:id` | ❌ Wrong name | ❌ Missing | ⚠️ Optional | ✅ Middleware | 🔴 **FAIL** |

### Results Module

| Endpoint | Permission Check | School Filter | Academic Year | Teacher Assignment | Status |
|----------|------------------|---------------|---------------|-------------------|--------|
| `GET /results/:examSubjectId` | ❌ Wrong name | ⚠️ Partial | ✅ Good | ✅ Middleware | 🟡 **WARN** |
| `POST /results` | ❌ Wrong name | ⚠️ Partial | ✅ Good | ✅ Middleware | 🟡 **WARN** |
| `GET /results/student/:id/exam/:id` | ❌ Wrong name | ✅ Good | ✅ Good | N/A | 🟡 **WARN** |

### Assignment Module

| Endpoint | Permission Check | School Filter | Academic Year | Teacher Assignment | Status |
|----------|------------------|---------------|---------------|-------------------|--------|
| `GET /assignments` | ⚠️ None | ⚠️ Indirect | ⚠️ Optional | ✅ Controller | 🟡 **WARN** |
| `GET /assignments/:id` | ⚠️ None | ⚠️ Indirect | N/A | ✅ Controller | 🟡 **WARN** |
| `POST /assignments` | ✅ `isTeacher` | ⚠️ Indirect | N/A | ✅ Controller | 🟡 **WARN** |

### Exam Module

| Endpoint | Permission Check | School Filter | Academic Year | Teacher Assignment | Status |
|----------|------------------|---------------|---------------|-------------------|--------|
| `GET /exams` | ⚠️ None | ✅ Good | ✅ Good | N/A | ✅ **PASS** |
| `GET /exams/:id` | ⚠️ None | ✅ Good | ✅ Good | N/A | ✅ **PASS** |
| `POST /exams` | ✅ `isAdmin` | ✅ Good | ✅ Good | N/A | ✅ **PASS** |
| `PUT /exams/:id/publish` | ✅ `isAdmin` | ❌ Missing | N/A | N/A | 🔴 **FAIL** |

---

## 🔧 RECOMMENDED FIXES (Priority Order)

### Priority 1: Fix Permission Names (CRITICAL)

**Files to Update:**
1. `backend/src/routes/attendance.routes.js`
2. `backend/src/routes/result.routes.js`
3. Check all other route files for similar issues

**Action:**
```javascript
// Change from:
authorize('attendance:view')
authorize('results:enter')

// To:
authorize('attendance.view_class', 'attendance.view_all')  // For teachers/admins
authorize('result.enter')  // For results entry
```

### Priority 2: Add School Filters (CRITICAL)

**Files to Update:**
1. `backend/src/controllers/attendance.controller.js`
2. `backend/src/controllers/assignment.controller.js`
3. `backend/src/controllers/exam.controller.js` (publishExam)

**Pattern to Apply:**
```javascript
// Always filter by schoolId through relations
where: {
  ...existingWhere,
  student: {
    user: {
      schoolId: req.user.schoolId
    }
  }
}
```

### Priority 3: Enforce Academic Year Scoping

**Action:**
- Add middleware to validate academic year belongs to school
- Make academic year required (not optional) in queries
- Add validation in controllers

### Priority 4: Standardize Permission Usage

**Action:**
- Use granular permissions (`attendance.view_class` vs `attendance.view_all`)
- Update role-permission mappings in seed.js if needed
- Document which permissions should be used where

---

## 🧪 TESTING RECOMMENDATIONS

### Security Test Cases

1. **Cross-School Access Test:**
   - Create two schools with overlapping IDs
   - Login as user from School A
   - Try to access students/attendance from School B
   - **Expected:** Should fail with 403 Forbidden

2. **Permission Bypass Test:**
   - Login as student
   - Try to access teacher-only endpoints
   - **Expected:** Should fail with 403 Forbidden

3. **Teacher Assignment Test:**
   - Login as teacher assigned to Grade 10A Math
   - Try to mark attendance for Grade 10B Math
   - **Expected:** Should fail with 403 Forbidden

4. **Academic Year Scoping Test:**
   - Create data for 2023-2024 and 2024-2025
   - Query with wrong academic year
   - **Expected:** Should return empty or error

---

## 📊 COMPLIANCE CHECKLIST

- [ ] ✅ JWT Authentication implemented
- [ ] ✅ Refresh token mechanism
- [ ] ✅ Role-based access control
- [ ] ⚠️ Permission-based access (names mismatch)
- [ ] ❌ School-level data isolation (gaps found)
- [ ] ⚠️ Academic year scoping (partial)
- [ ] ✅ Teacher assignment validation
- [ ] ✅ Student ownership checks
- [ ] ✅ Parent-child relationship validation
- [ ] ⚠️ Input validation (needs review)

---

## 🎯 CONCLUSION

The system has a **strong architectural foundation** with excellent middleware design and RBAC implementation. However, **critical security gaps** must be addressed before production deployment:

1. **Permission name mismatches** render permission checks ineffective
2. **Missing school-level filters** create cross-school data leakage risks
3. **Incomplete academic year scoping** could lead to data confusion

**Estimated Fix Time:** 4-6 hours for critical issues

**Recommendation:** Fix Priority 1 and 2 issues immediately before any production deployment.

---

**Report Generated:** System Audit  
**Next Steps:** Implement fixes and re-audit

