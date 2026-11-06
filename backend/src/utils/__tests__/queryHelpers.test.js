/**
 * Unit tests for src/utils/queryHelpers.js.
 *
 * parsePagination is used by every list endpoint in the project
 * (CLAUDE.md section 3), so its clamping is the difference between a page of
 * results and a table scan. These tests read the real limits out of
 * src/config/index.js (a pure object literal, no DB) rather than hardcoding
 * them, so they keep testing the right thing if the config changes.
 */

const {
  parsePagination,
  parseSort,
  parseFilters,
  buildSearchQuery,
} = require('../queryHelpers');
const config = require('../../config');

const { defaultPage, defaultLimit, maxLimit } = config.pagination;

describe('config assumptions', () => {
  it('has the pagination defaults these tests rely on', () => {
    expect(defaultPage).toBe(1);
    expect(defaultLimit).toBe(10);
    expect(maxLimit).toBe(100);
  });
});

describe('parsePagination — defaults', () => {
  it('falls back to the configured defaults for an empty query', () => {
    expect(parsePagination({})).toEqual({
      page: defaultPage,
      limit: defaultLimit,
      skip: 0,
    });
  });

  it('computes skip as (page - 1) * limit', () => {
    expect(parsePagination({ page: '1', limit: '10' }).skip).toBe(0);
    expect(parsePagination({ page: '2', limit: '10' }).skip).toBe(10);
    expect(parsePagination({ page: '3', limit: '25' }).skip).toBe(50);
    expect(parsePagination({ page: '5', limit: '100' }).skip).toBe(400);
  });

  it('accepts numbers as well as strings', () => {
    expect(parsePagination({ page: 3, limit: 25 })).toEqual({
      page: 3,
      limit: 25,
      skip: 50,
    });
  });
});

describe('parsePagination — page clamping', () => {
  it.each([['0'], ['-1'], ['-999'], [0], [-5]])(
    'clamps page %p up to 1',
    (page) => {
      expect(parsePagination({ page }).page).toBe(1);
      expect(parsePagination({ page }).skip).toBe(0);
    }
  );

  it('truncates a fractional page rather than rejecting it', () => {
    expect(parsePagination({ page: '2.7' }).page).toBe(2);
  });

  it('does not cap page at the top end', () => {
    const result = parsePagination({ page: '100000', limit: '10' });
    expect(result.page).toBe(100000);
    expect(result.skip).toBe(999990);
  });
});

describe('parsePagination — limit clamping', () => {
  it('allows a limit exactly at the configured maximum', () => {
    expect(parsePagination({ limit: String(maxLimit) }).limit).toBe(maxLimit);
  });

  it.each([['101'], ['500'], ['1000000'], [250]])(
    'clamps limit %p down to the configured maximum',
    (limit) => {
      expect(parsePagination({ limit }).limit).toBe(maxLimit);
    }
  );

  it('treats limit=0 as "not supplied" and uses the default', () => {
    // `parseInt('0', 10) || defaultLimit` -- 0 is falsy, so the default wins
    // rather than the 1-clamp below.
    expect(parsePagination({ limit: '0' }).limit).toBe(defaultLimit);
  });

  it('clamps a negative limit up to 1', () => {
    expect(parsePagination({ limit: '-3' }).limit).toBe(1);
    expect(parsePagination({ limit: '-3' }).skip).toBe(0);
  });
});

describe('parsePagination — non-numeric and hostile input', () => {
  it.each([
    [{ page: 'abc', limit: 'xyz' }],
    [{ page: '', limit: '' }],
    [{ page: null, limit: null }],
    [{ page: undefined, limit: undefined }],
    [{ page: {}, limit: {} }],
    [{ page: [], limit: [] }],
    [{ page: 'DROP TABLE students', limit: 'DROP TABLE students' }],
  ])('falls back to the defaults for %p', (query) => {
    expect(parsePagination(query)).toEqual({
      page: defaultPage,
      limit: defaultLimit,
      skip: 0,
    });
  });

  it('parses a leading number out of a mixed string (parseInt behaviour)', () => {
    expect(parsePagination({ page: '3abc' }).page).toBe(3);
    expect(parsePagination({ limit: '20px' }).limit).toBe(20);
    // An injection attempt that starts with a digit is reduced to that digit,
    // which is safe here because only the number reaches Prisma.
    expect(parsePagination({ limit: '1; DELETE FROM students' })).toEqual({
      page: 1,
      limit: 1,
      skip: 0,
    });
  });

  it('always returns three finite numbers', () => {
    [{}, { page: 'x' }, { limit: '-1' }, { page: '1e40' }].forEach((query) => {
      const result = parsePagination(query);
      expect(Number.isFinite(result.page)).toBe(true);
      expect(Number.isFinite(result.limit)).toBe(true);
      expect(Number.isFinite(result.skip)).toBe(true);
      expect(result.limit).toBeLessThanOrEqual(maxLimit);
      expect(result.page).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('parseSort', () => {
  it.each([[undefined], [null], [''], [0]])(
    'defaults to createdAt desc for %p',
    (input) => {
      expect(parseSort(input)).toEqual({ createdAt: 'desc' });
    }
  );

  it('parses a single field:direction pair', () => {
    expect(parseSort('name:asc')).toEqual({ name: 'asc' });
    expect(parseSort('name:desc')).toEqual({ name: 'desc' });
  });

  it('parses several comma-separated pairs, preserving order', () => {
    expect(parseSort('name:asc,age:desc')).toEqual({ name: 'asc', age: 'desc' });
    expect(Object.keys(parseSort('name:asc,age:desc'))).toEqual(['name', 'age']);
  });

  it('treats anything that is not exactly "asc" as desc', () => {
    expect(parseSort('name:bogus')).toEqual({ name: 'desc' });
    expect(parseSort('name:ASC')).toEqual({ name: 'desc' }); // case sensitive
    expect(parseSort('name')).toEqual({ name: 'desc' }); // no direction at all
  });

  it('keeps only whitelisted fields when an allow-list is given', () => {
    expect(parseSort('name:asc,secretColumn:asc', ['name'])).toEqual({
      name: 'asc',
    });
  });

  it('falls back to the default sort when nothing survives the allow-list', () => {
    expect(parseSort('secretColumn:asc', ['name'])).toEqual({
      createdAt: 'desc',
    });
  });

  it('allows every field when the allow-list is empty (the default)', () => {
    expect(parseSort('anything:asc')).toEqual({ anything: 'asc' });
  });

  it('does not trim whitespace, so " name" is a different field', () => {
    // Documented sharp edge: callers must not send "a:asc, b:desc".
    expect(parseSort('name:asc, age:desc')).toEqual({
      name: 'asc',
      ' age': 'desc',
    });
  });

  it('lets the last duplicate win', () => {
    expect(parseSort('name:asc,name:desc')).toEqual({ name: 'desc' });
  });
});

describe('parseFilters', () => {
  it('picks out only the filterable fields that are present and non-empty', () => {
    const query = { status: 'ACTIVE', gender: '', junk: 'x', classId: '5' };
    expect(parseFilters(query, ['status', 'gender', 'classId'])).toEqual({
      status: 'ACTIVE',
      classId: '5',
    });
  });

  it('returns an empty object when nothing is filterable', () => {
    expect(parseFilters({ status: 'ACTIVE' }, [])).toEqual({});
    expect(parseFilters({}, ['status'])).toEqual({});
  });

  it('keeps a literal "false" string and a 0', () => {
    expect(parseFilters({ isActive: 'false', count: 0 }, ['isActive', 'count'])).toEqual(
      { isActive: 'false', count: 0 }
    );
  });
});

describe('buildSearchQuery', () => {
  it('returns undefined when there is nothing to search', () => {
    expect(buildSearchQuery('', ['name'])).toBeUndefined();
    expect(buildSearchQuery(null, ['name'])).toBeUndefined();
    expect(buildSearchQuery('ram', [])).toBeUndefined();
  });

  it('builds a Prisma OR/contains clause across the given fields', () => {
    expect(buildSearchQuery('ram', ['firstName', 'lastName'])).toEqual({
      OR: [
        { firstName: { contains: 'ram' } },
        { lastName: { contains: 'ram' } },
      ],
    });
  });
});
