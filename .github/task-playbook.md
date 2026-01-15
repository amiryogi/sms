# Task Playbook

When implementing a new feature:

1. Inspect prisma/schema.prisma
2. Identify reusable tables
3. Propose minimal schema changes if needed
4. Implement backend first
5. Secure with RBAC
6. Add frontend UI last

Never implement frontend without backend support.
Never bypass RBAC.
