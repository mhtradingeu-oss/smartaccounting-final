const normalizeCompanyId = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const candidate = Number(value);
  return Number.isNaN(candidate) ? undefined : candidate;
};

const buildCompanyFilter = (companyId) => {
  const normalized = normalizeCompanyId(companyId);
  return normalized !== undefined ? { companyId: normalized } : {};
};

module.exports = {
  normalizeCompanyId,
  buildCompanyFilter,
};
