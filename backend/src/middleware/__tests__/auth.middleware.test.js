/**
 * authenticate / optionalAuth with Prisma and JWT replaced.
 */
jest.mock('../../config/database', () => ({
  user: { findUnique: jest.fn() },
  role: { findUnique: jest.fn() },
}));
jest.mock('../../config', () => ({ jwt: { secret: 'test-secret' } }));
jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));

const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');
const { authenticate, optionalAuth } = require('../auth.middleware');

const run = (mw, req) =>
  new Promise((resolve) => {
    mw(req, {}, (err) => resolve(err));
  });

const withToken = () => ({ headers: { authorization: 'Bearer abc' } });

const role = (name, perms = []) => ({
  role: { name, rolePermissions: perms.map((p) => ({ permission: { name: p } })) },
});

const dbUser = (overrides = {}) => ({
  id: 7,
  email: 'a@b.c',
  firstName: 'A',
  lastName: 'B',
  schoolId: 1,
  status: 'active',
  school: { id: 1, isActive: true },
  userRoles: [role('TEACHER', ['exam.read'])],
  student: null,
  parent: null,
  ...overrides,
});

beforeEach(() => {
  jwt.verify.mockReset();
  prisma.user.findUnique.mockReset();
  prisma.role.findUnique.mockReset();
  jwt.verify.mockReturnValue({ userId: 7 });
});

describe('authenticate', () => {
  it('attaches the user context', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser());
    const req = withToken();
    expect(await run(authenticate, req)).toBeUndefined();
    expect(req.user).toMatchObject({ id: 7, schoolId: 1, roles: ['TEACHER'], permissions: ['exam.read'] });
    expect(req.user.parentId).toBeUndefined();
  });

  it('rejects a user with no roles (403)', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser({ userRoles: [] }));
    const err = await run(authenticate, withToken());
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Your account has no role assigned');
  });

  it('rejects an inactive school (403)', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser({ school: { id: 1, isActive: false } }));
    expect((await run(authenticate, withToken())).statusCode).toBe(403);
  });

  it('rejects an inactive user (401)', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser({ status: 'suspended' }));
    expect((await run(authenticate, withToken())).statusCode).toBe(401);
  });

  it('rejects a bad token (401)', async () => {
    jwt.verify.mockImplementation(() => {
      const e = new Error('bad');
      e.name = 'JsonWebTokenError';
      throw e;
    });
    const err = await run(authenticate, withToken());
    expect(err.statusCode).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('gives SUPER_ADMIN the ADMIN role permissions', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser({ userRoles: [role('SUPER_ADMIN')] }));
    prisma.role.findUnique.mockResolvedValue({
      name: 'ADMIN',
      rolePermissions: [{ permission: { name: 'student.list' } }],
    });
    const req = withToken();
    expect(await run(authenticate, req)).toBeUndefined();
    expect(req.user.permissions).toEqual(['student.list']);
    expect(req.user.schoolId).toBe(1);
  });
});

describe('optionalAuth', () => {
  it('passes through with no header', async () => {
    const req = { headers: {} };
    expect(await run(optionalAuth, req)).toBeUndefined();
    expect(req.user).toBeUndefined();
  });

  it('swallows auth failures and calls next exactly once', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser({ userRoles: [] }));
    const req = withToken();
    const next = jest.fn();
    optionalAuth(req, {}, next);
    await new Promise((r) => setImmediate(r));
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeUndefined();
  });

  it('sets req.user for a valid token', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser());
    const req = withToken();
    expect(await run(optionalAuth, req)).toBeUndefined();
    expect(req.user.id).toBe(7);
  });

  it('propagates unexpected errors', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('db down'));
    const err = await run(optionalAuth, withToken());
    expect(err.message).toBe('db down');
  });
});
