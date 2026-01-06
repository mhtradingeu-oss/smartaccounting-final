import { companiesAPI } from '../services/companiesAPI';
import { dashboardAPI } from '../services/dashboardAPI';

// Utility to reset all client-side state on company switch
// Call this in CompanyContext.switchCompany
export function resetClientState() {
  // Example: clear localStorage except auth token
  const token = localStorage.getItem('token');
  localStorage.clear();
  if (token) {
    localStorage.setItem('token', token);
  }
  companiesAPI.clearCache();
  dashboardAPI.clearCache();
  // Add more resets as needed (e.g., query cache, redux, etc.)
}
