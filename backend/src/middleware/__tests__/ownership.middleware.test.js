/**
 * Ownership middleware must fail closed. Prisma is replaced before it loads;
 * each test sets the rows the fake models return and inspects the `where`
 * clauses the middleware built.
 */
jest.mock('../../config/database', () => ({
  academicYear: { findFirst: jest.fn() },
  studentParent: { findFirst: jest.fn() },
  studentClass: { findFirst: jest.fn() },
  teacherSubject: { findFirst: jest.fn() },
  examSubject: { findFirst: jest.fn() },
  assignment: { findFirst: jest.fn() },
}));

const prisma = require('../../config/database');
const {
  isOwnStudent,
  isParentOfStudent,
  canAccessAttendance,
  canAccessResults,
  canAccessAssignment,
  isAssignedTeacher,
} = require('../ownership.middleware');

// asyncHandler does not return its promise, so resolve on next().
const run = (mw, req) =>
  new Promise((resolve) => {
    mw(req, {}, (err) => resolve(err));
  });

const user = (roles, extra = {}) => ({ id: 7, schoolId: 1, roles, permissions: [], ...extra });

const request = ({ method = 'GET', params = {}, query = {}, body = {}, u }) => ({
  method,
  params,
  query,
  body,
  user: u,
});

beforeEach(() => {
  Object.values(prisma).forEach((model) =>
    Object.values(model).forEach((fn) => fn.mockReset()),
  );
  prisma.academicYear.findFirst.mockResolvedValue({ id: 3 });
  prisma.studentParent.findFirst.mockResolvedValue(null);
  prisma.studentClass.findFirst.mockResolvedValue(null);
  prisma.teacherSubject.findFirst.mockResolvedValue(null);
});

describe('PARENT / STUDENT without a profile row', () => {
  it.each([
    ['isOwnStudent', isOwnStudent, { params: { id: '5' } }],
    ['isParentOfStudent', isParentOfStudent, { params: { studentId: '5' } }],
    ['canAccessAttendance', canAccessAttendance, { params: { studentId: '5' } }],
    ['canAccessResults', canAccessResults, { params: { studentId: '5' } }],
  ])('%s denies a PARENT with no parentId without querying', async (_name, mw, req) => {
    // Even if a link exists for *some* parent, it must not be found.
    prisma.studentParent.findFirst.mockResolvedValue({ id: 1 });
    const err = await run(mw, request({ ...req, u: user(['PARENT']) }));
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
    expect(prisma.studentParent.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    ['isOwnStudent', isOwnStudent, { params: { id: '5' } }],
    ['canAccessAttendance', canAccessAttendance, { params: { studentId: '5' } }],
    ['canAccessResults', canAccessResults, { params: { studentId: '5' } }],
  ])('%s denies a STUDENT with no studentId', async (_name, mw, req) => {
    const err = await run(mw, request({ ...req, u: user(['STUDENT']) }));
    expect(err.statusCode).toBe(403);
  });

  it('canAccessAssignment denies a STUDENT with no studentId', async () => {
    prisma.assignment.findFirst.mockResolvedValue({
      teacherSubject: { userId: 99, sectionId: 2, academicYearId: 3, classSubject: { classId: 4 } },
    });
    prisma.studentClass.findFirst.mockResolvedValue({ id: 1 });
    const err = await run(canAccessAssignment, request({ params: { id: '9' }, u: user(['STUDENT']) }));
    expect(err.statusCode).toBe(403);
    expect(prisma.studentClass.findFirst).not.toHaveBeenCalled();
  });
});

describe('parents and students with a profile', () => {
  it('allows a parent linked to the student, scoped to the school', async () => {
    prisma.studentParent.findFirst.mockResolvedValue({ id: 1 });
    const err = await run(isOwnStudent, request({ params: { id: '5' }, u: user(['PARENT'], { parentId: 11 }) }));
    expect(err).toBeUndefined();
    expect(prisma.studentParent.findFirst).toHaveBeenCalledWith({
      where: { parentId: 11, studentId: 5, schoolId: 1 },
    });
  });

  it('denies a parent not linked to the student', async () => {
    const err = await run(isOwnStudent, request({ params: { id: '5' }, u: user(['PARENT'], { parentId: 11 }) }));
    expect(err.statusCode).toBe(403);
  });

  it('allows a student their own record only', async () => {
    const u = user(['STUDENT'], { studentId: 5 });
    expect(await run(isOwnStudent, request({ params: { id: '5' }, u }))).toBeUndefined();
    expect((await run(isOwnStudent, request({ params: { id: '6' }, u }))).statusCode).toBe(403);
  });

  it('rejects a malformed student id with 400', async () => {
    const err = await run(isOwnStudent, request({ params: { id: 'abc' }, u: user(['PARENT'], { parentId: 11 }) }));
    expect(err.statusCode).toBe(400);
  });

  it('a TEACHER who is also a PARENT is allowed through the parent link', async () => {
    prisma.studentParent.findFirst.mockResolvedValue({ id: 1 });
    const err = await run(isOwnStudent, request({ params: { id: '5' }, u: user(['TEACHER', 'PARENT'], { parentId: 11 }) }));
    expect(err).toBeUndefined();
  });
});

describe('teacher scoping', () => {
  it('isOwnStudent matches the assignment in the current academic year', async () => {
    prisma.studentClass.findFirst.mockResolvedValue({ classId: 4, sectionId: 2 });
    prisma.teacherSubject.findFirst.mockResolvedValue({ id: 1 });
    const err = await run(isOwnStudent, request({ params: { id: '5' }, u: user(['TEACHER']) }));
    expect(err).toBeUndefined();
    expect(prisma.studentClass.findFirst.mock.calls[0][0].where).toMatchObject({
      studentId: 5,
      academicYearId: 3,
      schoolId: 1,
    });
    expect(prisma.teacherSubject.findFirst.mock.calls[0][0].where).toMatchObject({
      userId: 7,
      academicYearId: 3,
      sectionId: 2,
      classSubject: { classId: 4, academicYearId: 3 },
    });
  });

  it('denies a teacher when no academic year is current', async () => {
    prisma.academicYear.findFirst.mockResolvedValue(null);
    const err = await run(isOwnStudent, request({ params: { id: '5' }, u: user(['TEACHER']) }));
    expect(err.statusCode).toBe(403);
    expect(prisma.teacherSubject.findFirst).not.toHaveBeenCalled();
  });

  it('canAccessAttendance on POST uses the body, not the query string', async () => {
    prisma.teacherSubject.findFirst.mockResolvedValue({ id: 1 });
    const err = await run(
      canAccessAttendance,
      request({
        method: 'POST',
        query: { classId: '1', sectionId: '1' },
        body: { classId: 4, sectionId: 2 },
        u: user(['TEACHER']),
      }),
    );
    expect(err).toBeUndefined();
    expect(prisma.teacherSubject.findFirst.mock.calls[0][0].where).toMatchObject({
      sectionId: 2,
      academicYearId: 3,
      classSubject: { classId: 4 },
    });
  });

  it('canAccessResults reads examSubjectId and sectionId from the POST body', async () => {
    prisma.examSubject.findFirst.mockResolvedValue({ id: 8, classSubjectId: 12 });
    prisma.teacherSubject.findFirst.mockResolvedValue({ id: 1 });
    const err = await run(
      canAccessResults,
      request({ method: 'POST', body: { examSubjectId: 8, sectionId: 2 }, u: user(['TEACHER']) }),
    );
    expect(err).toBeUndefined();
    expect(prisma.examSubject.findFirst.mock.calls[0][0].where).toEqual({
      id: 8,
      exam: { schoolId: 1 },
    });
    expect(prisma.teacherSubject.findFirst.mock.calls[0][0].where).toMatchObject({
      classSubjectId: 12,
      sectionId: 2,
      academicYearId: 3,
    });
  });

  it('canAccessResults denies a teacher not assigned to the section', async () => {
    prisma.examSubject.findFirst.mockResolvedValue({ id: 8, classSubjectId: 12 });
    const err = await run(
      canAccessResults,
      request({ params: { examSubjectId: '8' }, query: { sectionId: '2' }, u: user(['TEACHER']) }),
    );
    expect(err.statusCode).toBe(403);
  });

  it('isAssignedTeacher reads query params on GET', async () => {
    prisma.teacherSubject.findFirst.mockResolvedValue({ id: 1 });
    const err = await run(
      isAssignedTeacher,
      request({ query: { classId: '4', sectionId: '2' }, u: user(['TEACHER']) }),
    );
    expect(err).toBeUndefined();
    expect(prisma.teacherSubject.findFirst.mock.calls[0][0].where).toMatchObject({
      userId: 7,
      sectionId: 2,
      academicYearId: 3,
      classSubject: { classId: 4 },
    });
  });
});

describe('admins', () => {
  it.each([['ADMIN'], ['SUPER_ADMIN']])('%s bypasses ownership checks', async (role) => {
    const err = await run(isOwnStudent, request({ params: { id: '5' }, u: user([role]) }));
    expect(err).toBeUndefined();
  });
});
