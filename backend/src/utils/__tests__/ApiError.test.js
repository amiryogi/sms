/**
 * Unit tests for src/utils/ApiError.js.
 *
 * CLAUDE.md section 3: controllers must throw ApiError and never hand-roll
 * res.status(...).json(...), and the global error middleware reads
 * statusCode / message / errors off these instances.
 */

const ApiError = require('../ApiError');

describe('ApiError constructor', () => {
  it('is a real Error subclass so asyncHandler/next() can carry it', () => {
    const err = new ApiError(400, 'Bad');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Bad');
    expect(err.stack).toBeTruthy();
  });

  it('stores statusCode, errors and the isOperational flag', () => {
    const details = [{ field: 'email', msg: 'required' }];
    const err = new ApiError(422, 'Invalid', details);
    expect(err.statusCode).toBe(422);
    expect(err.errors).toEqual(details);
    expect(err.isOperational).toBe(true);
  });

  it('defaults errors to an empty array', () => {
    expect(new ApiError(500, 'Boom').errors).toEqual([]);
  });

  it('keeps the constructor out of the captured stack', () => {
    const err = new ApiError(400, 'Bad');
    expect(err.stack.split('\n')[0]).toContain('Bad');
    expect(err.stack).not.toContain('new ApiError');
  });
});

describe('ApiError static helpers — status codes', () => {
  const cases = [
    ['badRequest', 400],
    ['unauthorized', 401],
    ['forbidden', 403],
    ['notFound', 404],
    ['conflict', 409],
    ['unprocessable', 422],
    ['internal', 500],
  ];

  it.each(cases)('ApiError.%s() -> HTTP %i', (method, statusCode) => {
    const err = ApiError[method]('custom message');
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(statusCode);
    expect(err.message).toBe('custom message');
  });

  it('covers every static factory on the class', () => {
    const statics = Object.getOwnPropertyNames(ApiError).filter(
      (name) => typeof ApiError[name] === 'function'
    );
    expect(statics.sort()).toEqual(cases.map(([m]) => m).sort());
  });
});

describe('ApiError static helpers — default messages', () => {
  it.each([
    ['unauthorized', 'Unauthorized'],
    ['forbidden', 'Forbidden'],
    ['notFound', 'Resource not found'],
    ['conflict', 'Conflict'],
    ['internal', 'Internal server error'],
  ])('ApiError.%s() defaults the message to %p', (method, message) => {
    expect(ApiError[method]().message).toBe(message);
  });

  it('has no default message for badRequest or unprocessable', () => {
    // These are always thrown with an explanation in this codebase.
    expect(ApiError.badRequest().message).toBe('');
    expect(ApiError.unprocessable().message).toBe('');
  });
});

describe('ApiError validation payloads', () => {
  it('carries an express-validator style array through badRequest', () => {
    const details = [
      { field: 'marksObtained', message: 'must be <= fullMarks' },
      { field: 'examId', message: 'required' },
    ];
    const err = ApiError.badRequest('Validation failed', details);
    expect(err.statusCode).toBe(400);
    expect(err.errors).toHaveLength(2);
    expect(err.errors[0].field).toBe('marksObtained');
  });

  it('carries details through unprocessable too', () => {
    expect(ApiError.unprocessable('Nope', [{ a: 1 }]).errors).toEqual([{ a: 1 }]);
  });

  it('leaves errors empty for the no-detail helpers', () => {
    expect(ApiError.notFound('Student not found').errors).toEqual([]);
    expect(ApiError.forbidden().errors).toEqual([]);
  });
});
