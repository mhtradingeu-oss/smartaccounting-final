export function ensureCompanyHydrated(companies, activeCompany, setActiveCompany) {
  if (!companies || companies.length === 0) {return;}

  const savedId = localStorage.getItem('activeCompanyId');

  const found =
    companies.find(c => String(c.id) === String(savedId)) ||
    companies[0];

  if (!activeCompany) {
    setActiveCompany(found);
    localStorage.setItem('activeCompanyId', found.id);
  }
}
