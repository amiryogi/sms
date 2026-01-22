# Copilot Instructions

K-12 School Management System for Nepal. Node.js/Express backend, React SPA frontend, Prisma ORM with MySQL.

## Critical Rules

1. **Always read `backend/prisma/schema.prisma` before modifying data logic** - 1300+ lines define all models and relations
2. **School data isolation is mandatory** - Every query MUST filter by `req.user.schoolId`
3. **Backend enforces all security** - Frontend checks are UX only, never trust them

## Architecture Patterns

### Backend Request Flow

```
Route → authenticate → authorize/requireRole → ownership middleware → validate → controller
```

**Key files:**

- [backend/src/middleware/auth.middleware.js](backend/src/middleware/auth.middleware.js) - JWT verification, attaches `req.user` with roles/permissions
- [backend/src/middleware/authorize.middleware.js](backend/src/middleware/authorize.middleware.js) - `requireRole()`, `authorize()`, `isAdmin`, `isTeacher`
- [backend/src/middleware/ownership.middleware.js](backend/src/middleware/ownership.middleware.js) - `isOwnStudent`, `isAssignedTeacher`, `canAccessAttendance`

### Controller Pattern

```js
const getResource = asyncHandler(async (req, res) => {
  const where = { schoolId: req.user.schoolId, ...filters }; // ALWAYS include schoolId
  const data = await prisma.model.findMany({ where });
  return ApiResponse.success(res, data); // Use ApiResponse helpers
});
```

### Route Pattern

```js
router.get(
  "/",
  authenticate,
  requireRole("ADMIN", "TEACHER"),
  validate,
  controller.list,
);
router.get("/:id", authenticate, isOwnStudent, controller.get); // ownership check
router.post(
  "/",
  authenticate,
  isAdmin,
  validationRules,
  validate,
  controller.create,
);
```

### Frontend Service Pattern

All API calls go through [frontend/src/api/apiClient.js](frontend/src/api/apiClient.js) (Axios with JWT interceptor, auto-refresh).

```js
// frontend/src/api/studentService.js
export const studentService = {
  getAll: (params) => apiClient.get("/students", { params }),
  getById: (id) => apiClient.get(`/students/${id}`),
};
```

## Key Conventions

| Area       | Convention                                                 | Example                                        |
| ---------- | ---------------------------------------------------------- | ---------------------------------------------- |
| Validation | Use `express-validator` rules in `backend/src/validators/` | `studentRules`, `idParamRule`                  |
| Errors     | Use `ApiError` static methods                              | `throw ApiError.notFound('Student not found')` |
| Responses  | Use `ApiResponse` helpers                                  | `ApiResponse.paginated(res, data, pagination)` |
| Pagination | Use `parsePagination(req.query)`                           | Returns `{ page, limit, skip }`                |
| Enums      | Defined in Prisma schema                                   | `ExamType`, `AttendanceStatus`, `UserStatus`   |

## RBAC (Role-Based Access Control)

### Data Model

```
User → UserRoles → Role → RolePermissions → Permission
```

- Users can have multiple roles via `UserRoles` junction table
- Roles have multiple permissions via `RolePermissions` junction table
- `req.user.roles` = array of role names, `req.user.permissions` = array of permission names

### Role Hierarchy

| Role          | Access Scope                                               |
| ------------- | ---------------------------------------------------------- |
| `SUPER_ADMIN` | Cross-school access                                        |
| `ADMIN`       | Full school access                                         |
| `TEACHER`     | Assigned class/section/subject only (via `TeacherSubject`) |
| `STUDENT`     | Own data only (via `isOwnStudent` middleware)              |
| `PARENT`      | Linked children only (via `StudentParent` relation)        |
| `EXAMOFFICER` | Exam management                                            |
| `ACCOUNTANT`  | Fee management                                             |

### Authorization Middleware Usage

```js
// Role-based: user must have ANY of these roles
requireRole("ADMIN", "TEACHER");

// Permission-based: user must have ANY of these permissions
authorize("student:read", "student:write");

// Convenience shortcuts
isAdmin; // SUPER_ADMIN or ADMIN
isTeacher; // TEACHER role
isStudent; // STUDENT role
```

## Developer Commands

```bash
# Backend (from backend/)
npm run dev                 # Start with nodemon
npm run prisma:studio       # Visual DB browser
npm run prisma:migrate      # Create migration
npm run seed                # Seed demo data

# Frontend (from frontend/)
npm run dev                 # Vite dev server on :5173
```

**Default login:** admin@demoschool.edu.np / Admin@123 / School: DEMO001

## Adding a New Feature

1. Add/extend model in `backend/prisma/schema.prisma`
2. Create validator in `backend/src/validators/{feature}.validators.js`
3. Create controller in `backend/src/controllers/{feature}.controller.js`
4. Create route in `backend/src/routes/{feature}.routes.js` with proper middleware
5. Register route in `backend/src/routes/index.js`
6. Create frontend service in `frontend/src/api/{feature}Service.js`
7. Add pages under `frontend/src/pages/{role}/` with `ProtectedRoute`
