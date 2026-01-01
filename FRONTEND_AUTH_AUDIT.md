# 🔐 Frontend Auth & Routing Audit Report

**Date:** January 1, 2026  
**Auditor:** Senior System Maintainer  
**Scope:** Frontend authentication, authorization, and routing implementation

---

## 📋 Executive Summary

The frontend has a **solid authentication foundation** with well-implemented JWT token refresh, context-based auth state, and role-based routing. However, several **issues and improvements** have been identified:

**Overall Score: 7/10** (Good implementation with minor issues)

### Key Findings Summary:
| Category | Status | Issues Found |
|----------|--------|--------------|
| JWT Token Handling | ✅ Good | Refresh logic works correctly |
| Auth Context | ⚠️ Warning | Missing schoolId in user context |
| Protected Routes | ✅ Good | Role-based protection works |
| Route Configuration | ⚠️ Warning | Legacy routes lack role checks |
| API Interceptors | ✅ Good | Token refresh implemented |
| Error Handling | ⚠️ Warning | Silent failures in some cases |

---

## 🔴 CRITICAL ISSUES

### 1. Login Response Missing Permissions

**Severity:** 🔴 **CRITICAL**  
**File:** `frontend/src/context/AuthContext.jsx`

**Problem:**
The login response doesn't include permissions, but `hasPermission()` function expects them:

```javascript
// Login stores user from login response (line 31-35)
const { user, accessToken, refreshToken } = data;
setUser(user);

// But hasPermission checks user.permissions
const hasPermission = (permission) => {
  return user?.permissions?.includes(permission);  // ❌ permissions not set on login
};
```

**Root Cause:**
Looking at the backend `auth.controller.js` (lines 100-120), the login response only returns roles, NOT permissions:
```javascript
user: {
  id: user.id,
  email: user.email,
  // ... other fields
  roles,  // ✅ Included
  // ❌ permissions NOT included
  school: { ... }
},
```

However, the `/auth/me` endpoint (lines 320-340) DOES return permissions.

**Impact:**
- After login, `hasPermission()` will always return `false`
- Permission-based UI guards will not work until page refresh
- App refresh calls `getProfile()` which properly loads permissions ✅

**Fix Required:**
Update backend login to include permissions OR call `getProfile()` after login.

---

### 2. Legacy Routes Without Role Protection

**Severity:** 🟡 **MEDIUM**  
**File:** `frontend/src/App.jsx` (lines 111-120)

**Problem:**
Legacy shared routes are protected but don't have role restrictions:

```javascript
{/* Legacy shared routes - redirect based on role */}
<Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
  <Route path="/students" element={<AdminStudents />} />  // ❌ Should be ADMIN only
  <Route path="/teachers" element={<AdminTeachers />} />  // ❌ Should be ADMIN only
  <Route path="/academic" element={<AcademicYears />} />  // ❌ Should be ADMIN only
  <Route path="/attendance" element={<TeacherAttendance />} />  // ❌ Should be TEACHER only
  // ...
</Route>
```

**Risk:**
Any authenticated user can navigate to `/students`, `/teachers`, etc. even if they shouldn't.

> [!IMPORTANT]
> While the **backend will reject unauthorized requests**, exposing admin pages to non-admin users is a security smell and poor UX.

**Fix Required:**
Add role checks to legacy routes OR remove them entirely.

---

## 🟡 MEDIUM PRIORITY ISSUES

### 3. RoleBasedDashboard Fallback to Admin

**Severity:** 🟡 **MEDIUM**  
**File:** `frontend/src/App.jsx` (lines 136-153)

**Problem:**
If user has no recognized role, they get redirected to `AdminDashboard`:

```javascript
function RoleBasedDashboard() {
  const { user } = useAuth();
  
  if (user?.roles?.includes('ADMIN')) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  // ... other roles
  
  return <AdminDashboard />;  // ❌ DANGEROUS FALLBACK
}
```

**Risk:**
- If roles array is empty or undefined, user sees admin dashboard
- Could expose admin UI to unauthorized users

**Fix Required:**
```javascript
// Should return unauthorized page or login redirect
return <Navigate to="/unauthorized" replace />;
```

---

### 4. Missing Token Expiration Check on Load

**Severity:** 🟡 **MEDIUM**  
**File:** `frontend/src/context/AuthContext.jsx`

**Problem:**
The app checks for token existence but doesn't validate expiration locally:

```javascript
useEffect(() => {
  const initializeAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        // Makes API call - could be slow/fail
        const { data } = await authService.getProfile();
        setUser(data);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        localStorage.clear();
      }
    }
    setLoading(false);
  };
  initializeAuth();
}, []);
```

**Impact:**
- App always makes network request even if token is obviously expired
- Slower initial load for expired tokens

**Recommendation:**
Add local JWT expiration check before making API call:
```javascript
import { jwtDecode } from 'jwt-decode';

const token = localStorage.getItem('accessToken');
if (token) {
  try {
    const decoded = jwtDecode(token);
    if (decoded.exp * 1000 < Date.now()) {
      // Token expired - try refresh or clear
      localStorage.clear();
      setLoading(false);
      return;
    }
    // Token valid - fetch profile
    const { data } = await authService.getProfile();
    setUser(data);
  } catch (error) {
    localStorage.clear();
  }
}
```

---

### 5. Inconsistent Navigation - Using `<a>` Tags

**Severity:** 🟡 **MEDIUM**  
**Files:** `frontend/src/pages/student/Dashboard.jsx`, `frontend/src/pages/parent/Dashboard.jsx`

**Problem:**
Pages use regular `<a>` tags instead of React Router's `<Link>` or `<NavLink>`:

```javascript
// Line 95-96 in student/Dashboard.jsx
<a href="/student/assignments" className="view-all-link">View All Assignments →</a>

// Lines 101-113 in student/Dashboard.jsx
<a href="/student/assignments" className="action-btn">
  <ClipboardList size={20} />
  <span>My Assignments</span>
</a>
```

**Impact:**
- Full page reload on every navigation
- Loss of React state
- Slower navigation
- Poor SPA experience

**Fix Required:**
Replace with React Router components:
```javascript
import { Link } from 'react-router-dom';

<Link to="/student/assignments" className="view-all-link">View All Assignments →</Link>
```

---

### 6. DashboardLayout Uses `window.location.pathname`

**Severity:** 🟡 **MEDIUM**  
**File:** `frontend/src/layouts/DashboardLayout.jsx` (lines 120, 132)

**Problem:**
Uses browser API instead of React Router:

```javascript
// Line 120
<div className="breadcrumb">
  Dashboard / {window.location.pathname.split('/').pop() || 'Overview'}
</div>

// Line 132
<motion.div key={window.location.pathname}>
```

**Impact:**
- May not update properly on route changes
- Not reactive to React Router state

**Fix Required:**
Use `useLocation` from React Router:
```javascript
const location = useLocation();

// In JSX
<div className="breadcrumb">
  Dashboard / {location.pathname.split('/').pop() || 'Overview'}
</div>
```

---

## ✅ STRENGTHS IDENTIFIED

### 1. Excellent Token Refresh Implementation

**File:** `frontend/src/api/apiClient.js`

**Strengths:**
- ✅ Automatic token refresh on 401 responses
- ✅ Request retry with new token
- ✅ Prevents infinite retry loops with `_retry` flag
- ✅ Clears localStorage and redirects on refresh failure
- ✅ Uses separate axios instance for refresh to avoid interceptor conflicts

```javascript
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  // ... refresh logic
}
```

### 2. Good Auth Context Structure

**File:** `frontend/src/context/AuthContext.jsx`

**Strengths:**
- ✅ Proper context creation with `createContext(null)`
- ✅ Custom hook with error handling (`useAuth`)
- ✅ Loading state for auth initialization
- ✅ Both `hasRole` and `hasPermission` utilities
- ✅ Clean logout with localStorage cleanup

### 3. Solid ProtectedRoute Implementation

**File:** `frontend/src/components/auth/ProtectedRoute.jsx`

**Strengths:**
- ✅ Shows loading state during auth check
- ✅ Preserves intended destination in location state
- ✅ Supports both role and permission checks
- ✅ Redirects to `/unauthorized` for role violations
- ✅ Uses `replace` to prevent back-button issues

### 4. Role-Based Navigation

**File:** `frontend/src/layouts/DashboardLayout.jsx`

**Strengths:**
- ✅ Dynamic navigation based on user roles
- ✅ Multi-role support (user can see menus for all their roles)
- ✅ Clean sidebar with user info display
- ✅ Proper logout handling with navigation

### 5. Lazy Loading Implementation

**File:** `frontend/src/App.jsx`

**Strengths:**
- ✅ All pages use `React.lazy()` for code splitting
- ✅ Proper `React.Suspense` with fallback
- ✅ Performance optimization for initial load

---

## 📊 ROUTE PROTECTION ANALYSIS

### Admin Routes ✅
| Route | Role Check | Backend Protection |
|-------|------------|-------------------|
| `/admin/dashboard` | `roles={['ADMIN']}` ✅ | Yes |
| `/admin/academic-years` | `roles={['ADMIN']}` ✅ | Yes |
| `/admin/students` | `roles={['ADMIN']}` ✅ | Yes |
| `/admin/teachers` | `roles={['ADMIN']}` ✅ | Yes |

### Teacher Routes ✅
| Route | Role Check | Backend Protection |
|-------|------------|-------------------|
| `/teacher/dashboard` | `roles={['TEACHER', 'ADMIN']}` ✅ | Yes |
| `/teacher/attendance` | `roles={['TEACHER', 'ADMIN']}` ✅ | Yes |
| `/teacher/assignments` | `roles={['TEACHER', 'ADMIN']}` ✅ | Yes |

### Student Routes ✅
| Route | Role Check | Backend Protection |
|-------|------------|-------------------|
| `/student/dashboard` | `roles={['STUDENT']}` ✅ | Yes |
| `/student/assignments` | `roles={['STUDENT']}` ✅ | Yes |
| `/student/results` | `roles={['STUDENT']}` ✅ | Yes |

### Parent Routes ✅
| Route | Role Check | Backend Protection |
|-------|------------|-------------------|
| `/parent/dashboard` | `roles={['PARENT']}` ✅ | Yes |
| `/parent/attendance` | `roles={['PARENT']}` ✅ | Yes |
| `/parent/results` | `roles={['PARENT']}` ✅ | Yes |

### Legacy Routes ⚠️
| Route | Role Check | Risk |
|-------|------------|------|
| `/dashboard` | None (just auth) | Low - redirects based on role |
| `/students` | None ⚠️ | Medium - UI visible but API blocked |
| `/teachers` | None ⚠️ | Medium |
| `/academic` | None ⚠️ | Medium |
| `/attendance` | None ⚠️ | Medium |

---

## 🔧 RECOMMENDED FIXES

### Priority 1: Fix Permission Loading on Login (CRITICAL)

**Option A: Update Backend Login**
```javascript
// backend/src/controllers/auth.controller.js - login function
// Add permissions to login response (similar to getMe)
const permissions = [];
user.userRoles.forEach((ur) => {
  ur.role.rolePermissions.forEach((rp) => {
    if (!permissions.includes(rp.permission.name)) {
      permissions.push(rp.permission.name);
    }
  });
});

ApiResponse.success(res, {
  user: {
    // ... existing fields
    roles,
    permissions,  // ADD THIS
    school: { ... }
  },
  accessToken,
  refreshToken,
});
```

**Option B: Fetch Profile After Login (Frontend)**
```javascript
// frontend/src/context/AuthContext.jsx
const login = async (credentials) => {
  const { data } = await authService.login(credentials);
  const { accessToken, refreshToken } = data;
  
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  
  // Fetch full profile with permissions
  const profile = await authService.getProfile();
  setUser(profile.data);
  return profile.data;
};
```

### Priority 2: Fix RoleBasedDashboard Fallback

```javascript
function RoleBasedDashboard() {
  const { user } = useAuth();
  
  if (!user || !user.roles || user.roles.length === 0) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (user.roles.includes('ADMIN')) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (user.roles.includes('TEACHER')) {
    return <Navigate to="/teacher/dashboard" replace />;
  }
  if (user.roles.includes('STUDENT')) {
    return <Navigate to="/student/dashboard" replace />;
  }
  if (user.roles.includes('PARENT')) {
    return <Navigate to="/parent/dashboard" replace />;
  }
  
  return <Navigate to="/unauthorized" replace />;  // SAFE FALLBACK
}
```

### Priority 3: Add Role Checks to Legacy Routes OR Remove Them

**Option A: Add Role Checks**
```javascript
{/* Legacy routes with proper protection */}
<Route element={<ProtectedRoute roles={['ADMIN']}><DashboardLayout /></ProtectedRoute>}>
  <Route path="/students" element={<AdminStudents />} />
  <Route path="/teachers" element={<AdminTeachers />} />
  <Route path="/academic" element={<AcademicYears />} />
</Route>
<Route element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><DashboardLayout /></ProtectedRoute>}>
  <Route path="/attendance" element={<TeacherAttendance />} />
</Route>
```

**Option B: Remove Legacy Routes** (Recommended)
```javascript
// Remove lines 112-120 entirely
// Users must use role-specific routes
```

### Priority 4: Replace `<a>` Tags with React Router Links

**In all dashboard and page files:**
```javascript
// Before
<a href="/student/assignments" className="action-btn">

// After
import { Link } from 'react-router-dom';
<Link to="/student/assignments" className="action-btn">
```

---

## 🧪 TESTING RECOMMENDATIONS

### Test Cases

1. **Login Permission Test:**
   - Login as teacher
   - Immediately check `hasPermission('attendance.mark')`
   - Expected: Should return `true` (currently fails until refresh)

2. **Role Fallback Test:**
   - Create user with no roles
   - Login and access `/dashboard`
   - Expected: Should redirect to `/unauthorized` (currently shows admin dashboard)

3. **Legacy Route Access Test:**
   - Login as student
   - Navigate to `/students`
   - Expected: Should redirect to `/unauthorized` (currently shows admin page)

4. **Token Expiration Test:**
   - Set expired token in localStorage
   - Reload app
   - Expected: Should redirect to login quickly

---

## 📝 COMPLIANCE CHECKLIST

- [x] ✅ JWT authentication implemented
- [x] ✅ Refresh token mechanism
- [x] ✅ Protected routes for all role-specific pages
- [ ] ⚠️ Permission-based access (login doesn't return permissions)
- [x] ✅ Role-based navigation
- [ ] ⚠️ Legacy routes need role protection
- [x] ✅ Auth state persistence
- [x] ✅ Proper logout cleanup
- [ ] ⚠️ Local token validation before API call
- [ ] ⚠️ React Router navigation (some pages use `<a>` tags)

---

## 🎯 CONCLUSION

The frontend authentication and routing implementation is **generally solid** with good patterns for:
- Token management and refresh
- Context-based auth state
- Role-based protected routes
- Lazy loading for performance

**However, three key issues must be addressed:**

1. **🔴 Login doesn't include permissions** - Causes `hasPermission()` to fail until page refresh
2. **🟡 RoleBasedDashboard falls back to admin** - Security risk for users with no/unknown roles
3. **🟡 Legacy routes lack role protection** - Exposes admin UI to all authenticated users

**Estimated Fix Time:** 2-3 hours

**Recommendation:** Fix Priority 1 (permissions) immediately as it affects permission-based UI elements.

---

**Report Generated:** January 1, 2026  
**Next Steps:** Implement fixes and verify in browser testing
