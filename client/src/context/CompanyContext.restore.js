export function restoreCompany(companies, setActiveCompany) {
  const savedId = localStorage.getItem('activeCompanyId');

  if (!companies || companies.length === 0) {return;}

  const found =
    companies.find(c => String(c.id) === String(savedId)) ||
    companies[0];

  localStorage.setItem('activeCompanyId', found.id);
  setActiveCompany(found);
}
