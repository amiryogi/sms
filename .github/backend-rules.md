# Backend Rules

Architecture:

- Routes → Controllers → Services → Prisma
- No Prisma calls inside routes
- Controllers handle validation + RBAC
- Services handle business logic

RBAC:

- ADMIN: full access
- TEACHER: no financial access
- STUDENT/PARENT: read-only finance

Never expose cross-role or cross-user data.
