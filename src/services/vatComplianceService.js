// VAT/UStG Compliance Service
// - Validates allowed VAT rates (0, 7, 19)
// - Checks net/VAT/gross consistency
// - Enforces EUR currency
// - Returns structured compliance errors

const ALLOWED_VAT_RATES = [0, 7, 19];

class VatComplianceService {
  /**
   * Validate a transaction for UStG compliance
   * @param {Object} tx - { net, vat, gross, vatRate, currency }
   * @returns {Object} { valid: boolean, errors: [ { code, message } ] }
   */
  validateTransaction({ net, vat, gross, vatRate, currency }) {
    const errors = [];
    // VAT rate
    if (!ALLOWED_VAT_RATES.includes(Number(vatRate))) {
      errors.push({ code: 'VAT_RATE_ILLEGAL', message: `VAT rate ${vatRate} is not allowed.` });
    }
    // Currency
    if (currency && currency !== 'EUR') {
      errors.push({ code: 'CURRENCY_ILLEGAL', message: 'Currency must be EUR.' });
    }
    // Net/VAT/Gross math
    const expectedVat = +(Number(net) * Number(vatRate) / 100).toFixed(2);
    const expectedGross = +(Number(net) + expectedVat).toFixed(2);
    if (Number(vat) !== expectedVat) {
      errors.push({ code: 'VAT_MISMATCH', message: `VAT amount ${vat} does not match net * rate (${expectedVat}).` });
    }
    if (Number(gross) !== expectedGross) {
      errors.push({ code: 'GROSS_MISMATCH', message: `Gross amount ${gross} does not match net + vat (${expectedGross}).` });
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = new VatComplianceService();
