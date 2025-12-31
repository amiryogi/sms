const config = require('../config');

/**
 * Parse pagination parameters from query string
 */
const parsePagination = (query) => {
  let page = parseInt(query.page, 10) || config.pagination.defaultPage;
  let limit = parseInt(query.limit, 10) || config.pagination.defaultLimit;

  // Ensure page is at least 1
  page = Math.max(1, page);

  // Ensure limit is within bounds
  limit = Math.min(Math.max(1, limit), config.pagination.maxLimit);

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Parse sorting parameters from query string
 * Format: sort=field:asc,field2:desc
 */
const parseSort = (sortString, allowedFields = []) => {
  if (!sortString) {
    return { createdAt: 'desc' }; // Default sort
  }

  const orderBy = {};
  const sortPairs = sortString.split(',');

  for (const pair of sortPairs) {
    const [field, direction] = pair.split(':');
    
    // Only allow sorting on specified fields (or all if not specified)
    if (allowedFields.length === 0 || allowedFields.includes(field)) {
      orderBy[field] = direction === 'asc' ? 'asc' : 'desc';
    }
  }

  return Object.keys(orderBy).length > 0 ? orderBy : { createdAt: 'desc' };
};

/**
 * Parse filter parameters from query string
 */
const parseFilters = (query, filterableFields = []) => {
  const filters = {};

  for (const field of filterableFields) {
    if (query[field] !== undefined && query[field] !== '') {
      filters[field] = query[field];
    }
  }

  return filters;
};

/**
 * Build Prisma where clause for search
 */
const buildSearchQuery = (searchTerm, searchFields = []) => {
  if (!searchTerm || searchFields.length === 0) {
    return undefined;
  }

  return {
    OR: searchFields.map((field) => ({
      [field]: {
        contains: searchTerm,
      },
    })),
  };
};

module.exports = {
  parsePagination,
  parseSort,
  parseFilters,
  buildSearchQuery,
};
