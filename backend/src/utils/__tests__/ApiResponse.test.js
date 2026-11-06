/**
 * Unit tests for src/utils/ApiResponse.js.
 *
 * CLAUDE.md section 3: the success shape is ALWAYS `{ success, message, data }`
 * and list endpoints return `ApiResponse.paginated`. The frontend's apiClient
 * and every service read that shape, so the envelope is a contract.
 *
 * `res` is a hand-rolled mock -- no Express app, no server, no DB.
 */

const ApiResponse = require('../ApiResponse');

const mockRes = () => {
  const res = {
    statusCode: undefined,
    body: undefined,
    sent: false,
    status: jest.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((body) => {
      res.body = body;
      return res;
    }),
    send: jest.fn(() => {
      res.sent = true;
      return res;
    }),
  };
  return res;
};

describe('ApiResponse.success', () => {
  it('returns 200 with { success, message, data } and nothing else', () => {
    const res = mockRes();
    ApiResponse.success(res, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({ success: true, message: 'Success', data: { id: 1 } });
    expect(Object.keys(res.body)).toEqual(['success', 'message', 'data']);
  });

  it('accepts a custom message and status code', () => {
    const res = mockRes();
    ApiResponse.success(res, [], 'Marks saved', 202);
    expect(res.statusCode).toBe(202);
    expect(res.body.message).toBe('Marks saved');
    expect(res.body.data).toEqual([]);
  });

  it.each([[null], [undefined], [0], [false], [[]], [{}]])(
    'passes the falsy/empty payload %p straight through',
    (data) => {
      const res = mockRes();
      ApiResponse.success(res, data);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(data);
    }
  );

  it('returns the res object so controllers can `return ApiResponse.success(...)`', () => {
    const res = mockRes();
    expect(ApiResponse.success(res, {})).toBe(res);
  });
});

describe('ApiResponse.created', () => {
  it('returns 201 with the created-by-default message', () => {
    const res = mockRes();
    ApiResponse.created(res, { id: 7 });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body).toEqual({
      success: true,
      message: 'Created successfully',
      data: { id: 7 },
    });
  });

  it('accepts a custom message', () => {
    const res = mockRes();
    ApiResponse.created(res, { id: 7 }, 'Exam created');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Exam created');
  });
});

describe('ApiResponse.noContent', () => {
  it('returns a bare 204 with no JSON body', () => {
    const res = mockRes();
    ApiResponse.noContent(res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.body).toBeUndefined();
  });
});

describe('ApiResponse.error', () => {
  it('returns { success: false, message } at the given status', () => {
    const res = mockRes();
    ApiResponse.error(res, 404, 'Student not found');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Student not found');
  });

  it('omits `errors` entirely when there are none', () => {
    const res = mockRes();
    ApiResponse.error(res, 500, 'Boom');
    expect(res.body.errors).toBeUndefined();
  });

  it('includes `errors` when details are supplied', () => {
    const res = mockRes();
    ApiResponse.error(res, 422, 'Validation failed', [{ field: 'code' }]);
    expect(res.body.errors).toEqual([{ field: 'code' }]);
  });

  it('never sets success: true', () => {
    const res = mockRes();
    ApiResponse.error(res, 400, 'Bad');
    expect(res.body.success).toBe(false);
  });
});

describe('ApiResponse.paginated — envelope shape', () => {
  it('returns 200 with data plus a pagination block', () => {
    const res = mockRes();
    ApiResponse.paginated(res, [{ id: 1 }], { page: 1, limit: 10, total: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(Object.keys(res.body)).toEqual([
      'success',
      'message',
      'data',
      'pagination',
    ]);
    expect(Object.keys(res.body.pagination)).toEqual([
      'page',
      'limit',
      'total',
      'totalPages',
      'hasNextPage',
      'hasPrevPage',
    ]);
  });

  it('echoes page, limit and total unchanged', () => {
    const res = mockRes();
    ApiResponse.paginated(res, [], { page: 3, limit: 25, total: 73 });
    expect(res.body.pagination.page).toBe(3);
    expect(res.body.pagination.limit).toBe(25);
    expect(res.body.pagination.total).toBe(73);
  });
});

describe('ApiResponse.paginated — totalPages arithmetic', () => {
  it.each([
    [0, 10, 0],
    [1, 10, 1],
    [10, 10, 1],
    [11, 10, 2],
    [73, 25, 3],
    [100, 100, 1],
    [101, 100, 2],
    [999, 10, 100],
  ])('total=%i limit=%i -> totalPages %i', (total, limit, totalPages) => {
    const res = mockRes();
    ApiResponse.paginated(res, [], { page: 1, limit, total });
    expect(res.body.pagination.totalPages).toBe(totalPages);
  });
});

describe('ApiResponse.paginated — hasNextPage / hasPrevPage', () => {
  const paginate = (page, limit, total) => {
    const res = mockRes();
    ApiResponse.paginated(res, [], { page, limit, total });
    return res.body.pagination;
  };

  it('first page of three', () => {
    expect(paginate(1, 10, 25)).toMatchObject({
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false,
    });
  });

  it('middle page of three', () => {
    expect(paginate(2, 10, 25)).toMatchObject({
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });
  });

  it('last page of three', () => {
    expect(paginate(3, 10, 25)).toMatchObject({
      totalPages: 3,
      hasNextPage: false,
      hasPrevPage: true,
    });
  });

  it('single page holding everything', () => {
    expect(paginate(1, 10, 7)).toMatchObject({
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });

  it('empty result set', () => {
    expect(paginate(1, 10, 0)).toMatchObject({
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });

  it('a page past the end still reports hasNextPage false', () => {
    expect(paginate(99, 10, 25)).toMatchObject({
      totalPages: 3,
      hasNextPage: false,
      hasPrevPage: true,
    });
  });

  it('page is exactly divisible by limit', () => {
    expect(paginate(2, 10, 20)).toMatchObject({
      totalPages: 2,
      hasNextPage: false,
      hasPrevPage: true,
    });
  });
});

describe('ApiResponse.paginated — degenerate pagination input', () => {
  // parsePagination never produces limit 0, but a controller that builds the
  // pagination object by hand can. Recorded so the behaviour is not a
  // surprise: Math.ceil(n / 0) is Infinity and Math.ceil(0 / 0) is NaN.
  it('yields Infinity totalPages when limit is 0 and total is not', () => {
    const res = mockRes();
    ApiResponse.paginated(res, [], { page: 1, limit: 0, total: 5 });
    expect(res.body.pagination.totalPages).toBe(Infinity);
    expect(res.body.pagination.hasNextPage).toBe(true);
  });

  it('yields NaN totalPages when both limit and total are 0', () => {
    const res = mockRes();
    ApiResponse.paginated(res, [], { page: 1, limit: 0, total: 0 });
    expect(Number.isNaN(res.body.pagination.totalPages)).toBe(true);
    expect(res.body.pagination.hasNextPage).toBe(false);
  });
});
