// Period-based locking for VAT returns
// Usage: lockPeriod(companyId, period)

const lockedPeriods = new Map(); // In-memory for demo; replace with DB in production

function getPeriodKey(companyId, period) {
  return `${companyId}:${period}`;
}

function isPeriodLocked(companyId, period) {
  return !!lockedPeriods.get(getPeriodKey(companyId, period));
}

function lockPeriod(companyId, period) {
  lockedPeriods.set(getPeriodKey(companyId, period), true);
}

function unlockPeriod(companyId, period) {
  lockedPeriods.delete(getPeriodKey(companyId, period));
}

module.exports = {
  isPeriodLocked,
  lockPeriod,
  unlockPeriod,
};
