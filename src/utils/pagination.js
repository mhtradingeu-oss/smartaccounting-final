const DEFAULT_PAGE_LIMIT = (() => {
  const fallback = 20;
  const parsed = Number.parseInt(process.env.DEFAULT_PAGE_LIMIT, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
})();

const MAX_PAGE_LIMIT = (() => {
  const parsed = Number.parseInt(process.env.MAX_PAGE_LIMIT, 10);
  if (Number.isFinite(parsed) && parsed >= DEFAULT_PAGE_LIMIT) {
    return parsed;
  }
  return Math.max(DEFAULT_PAGE_LIMIT, 200);
})();

const parsePositiveInt = (value, fallback = null) => {
  if (value === undefined || value === null) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < 0) {
    return fallback;
  }
  return parsed;
};

const getPagination = (query = {}) => {
  const sanitizedLimit = (() => {
    const requested = parsePositiveInt(query.limit);
    if (!requested) {
      return DEFAULT_PAGE_LIMIT;
    }
    return Math.min(Math.max(requested, 1), MAX_PAGE_LIMIT);
  })();

  const offsetFromQuery = parsePositiveInt(query.offset);
  const requestedPage = parsePositiveInt(query.page, 1);
  let page = Math.max(requestedPage || 1, 1);
  let offset = offsetFromQuery ?? ((page - 1) * sanitizedLimit);
  if (offsetFromQuery !== null) {
    page = Math.floor(offset / sanitizedLimit) + 1;
  }

  return {
    limit: sanitizedLimit,
    offset,
    page,
    maxLimit: MAX_PAGE_LIMIT,
  };
};

const buildPaginationMeta = ({
  total = 0,
  limit = DEFAULT_PAGE_LIMIT,
  offset = 0,
  page = 1,
  maxLimit = MAX_PAGE_LIMIT,
}) => {
  const normalizedTotal = Number.isFinite(total) ? total : Number.parseInt(total, 10) || 0;
  const totalPages = limit > 0
    ? Math.max(1, Math.ceil(normalizedTotal / limit))
    : 1;
  return {
    total: normalizedTotal,
    totalPages,
    currentPage: page,
    limit,
    offset,
    maxLimit,
    hasMore: page < totalPages,
  };
};

module.exports = {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  getPagination,
  buildPaginationMeta,
};
