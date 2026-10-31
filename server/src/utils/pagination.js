/**
 * Helper to parse pagination parameters from query string.
 * Supports: page, limit, search, sort (e.g. "created_at:desc", "name:asc")
 */
export function parsePaginationParams(query, defaultSort = { created_at: 'desc' }) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
  const skip = (page - 1) * limit;
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  let orderBy = defaultSort;
  if (query.sort && typeof query.sort === 'string') {
    const [field, direction] = query.sort.split(':');
    if (field) {
      orderBy = {
        [field]: direction?.toLowerCase() === 'asc' ? 'asc' : 'desc'
      };
    }
  }

  return {
    page,
    limit,
    skip,
    search,
    orderBy,
  };
}

/**
 * Returns standardized paginated response format
 */
export function formatPaginatedResponse({ data, total, page, limit }) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data,
    page,
    limit,
    total,
    totalPages,
  };
}

