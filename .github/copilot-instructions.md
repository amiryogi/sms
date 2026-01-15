# Copilot Instructions (Global)

You are working on a production-grade K-12 School Management System.

Before writing any code:

1. READ `prisma/schema.prisma` to understand existing tables and relations.
2. DO NOT invent new tables unless explicitly instructed.
3. Follow existing backend and frontend patterns.
4. Never break RBAC or data isolation rules.
5. Prefer extending existing models over duplicating logic.

This project uses:

- Node.js + Express
- Prisma ORM + MySQL
- React SPA
- JWT + Role-Based Access Control

Never trust frontend checks.
All validations and permissions must be enforced in backend.
