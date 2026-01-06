import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import AsyncModal from '../components/ui/AsyncModal';
import { useCompany } from '../context/CompanyContext';
import { bankStatementsAPI } from '../services/bankStatementsAPI';
import { formatCurrency, formatDate } from '../lib/utils/formatting';
import { PageNoAccessState } from '../components/ui/PageStates';

const SIMULATION_INVOICE_TEMPLATES = [
  { number: 'INV-5421', description: 'Monthly bookkeeping bundle' },
  { number: 'INV-5488', description: 'Cloud accounting retainer' },
  { number: 'INV-5512', description: 'Consulting sprint' },
  { number: 'INV-5673', description: 'Compliance health check' },
];

const MAX_MATCH_CARDS = 4;
const UNMATCHED_PREVIEW_LIMIT = 4;

const BankStatementReconciliationPreview = () => {
  const { statementId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const hasCompany = Boolean(activeCompany?.id);

  const initialTransactions = location.state?.transactions;
  const [transactions, setTransactions] = useState(initialTransactions ?? []);
  const [loading, setLoading] = useState(!initialTransactions?.length);
  const [error, setError] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);

  const statementSummary = location.state?.statement;
  const hasInitialTransactions = initialTransactions?.length > 0;

  useEffect(() => {
    if (!hasCompany || hasInitialTransactions || !statementId) {
      return undefined;
    }

    const controller = new AbortController();
    const fetchTransactions = async () => {
      setLoading(true);
      setError('');

      try {
        const payload = await bankStatementsAPI.transactions(statementId, { signal: controller.signal });
        const items = payload?.data ?? payload ?? [];
        setTransactions(Array.isArray(items) ? items : []);
      } catch (fetchError) {
        if (fetchError?.code === 'ERR_CANCELED') {
          return;
        }
        setError('Unable to load transactions for the simulation preview.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();

    return () => {
      controller.abort();
    };
  }, [hasInitialTransactions, statementId, hasCompany]);

  const simulation = useMemo(() => buildSimulationInsights(transactions), [transactions]);
  const hasTransactions = Boolean(transactions.length);
  const unmatchedPreview = simulation.unmatched.slice(0, UNMATCHED_PREVIEW_LIMIT);
  const hasMoreUnmatched = simulation.unmatched.length > unmatchedPreview.length;

  const renderDate = (value) => (value ? formatDate(value) : '—');

  if (!hasCompany) {
    return <PageNoAccessState />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {activeCompany?.name || 'Company'}
            </p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Reconciliation simulation
            </h1>
            <p className="text-sm text-gray-500">
              This preview explains what would happen if reconciliation were applied. No data is changed.
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            Statement ID {statementId}
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
        This is a simulation. No reconciliation has been performed and no data has been modified.
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white/80 py-14 dark:border-gray-700">
          <LoadingSpinner size="large" />
          <p className="text-sm text-gray-500">
            Gathering transactions to explain potential matches…
          </p>
        </div>
      ) : !hasTransactions ? (
        <EmptyState
          title="No transactions to preview"
          description="This statement has no transactions yet, so the simulation cannot suggest matches."
          action={
            <Link to={`/bank-statements/${statementId}`} state={{ statement: statementSummary }}>
              <Button variant="secondary" size="medium">
                Back to statement
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Total transactions" value={simulation.total} />
            <SummaryCard label="Potential matches found" value={simulation.matches.length} />
            <SummaryCard label="Unmatched transactions" value={simulation.unmatched.length} />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Simulation insights
                </p>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Potential matches
                </h2>
              </div>
              <p className="text-sm text-gray-500">
                Explaining {simulation.matches.length} match suggestions
              </p>
            </div>

            {simulation.matches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-white/70 px-4 py-6 text-sm text-gray-600">
                No reliable matches could be simulated for this selection yet.
              </p>
            ) : (
              <div className="space-y-4">
                {simulation.matches.map((match) => (
                  <div
                    key={match.id}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Match for {match.invoice.number}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {match.transaction.description || 'Bank transaction'}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(match.transaction.amount, match.transaction.currency || 'EUR')}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{match.explanation}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-gray-500">
                      <span>
                        Date proximity: within {match.dateDifferenceDays} day
                        {match.dateDifferenceDays === 1 ? '' : 's'} of {renderDate(match.invoice.date)}
                      </span>
                      <span>Amount similarity: {match.amountSimilarityPercent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Safety snapshot
                </p>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Unmatched transactions
                </h2>
              </div>
              <p className="text-sm text-gray-500">
                {simulation.unmatched.length} transactions remain unmatched
              </p>
            </div>

            {unmatchedPreview.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-white/70 px-4 py-6 text-sm text-gray-600">
                The simulation matched every transaction in the current subset.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:border-gray-700">
                {unmatchedPreview.map((item) => (
                  <li key={item.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {renderDate(item.date)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.amount, item.currency || 'EUR')}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {hasMoreUnmatched && (
              <p className="text-xs text-gray-500">
                Showing {unmatchedPreview.length} of {simulation.unmatched.length} unmatched transactions.
              </p>
            )}
          </section>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to={`/bank-statements/${statementId}`} state={{ statement: statementSummary }}>
          <Button variant="secondary" size="medium">
            Back
          </Button>
        </Link>
        <Button variant="outline" size="medium" onClick={() => navigate('/bank-statements')}>
          Close
        </Button>
        <Button variant="ghost" size="medium" onClick={() => setInfoOpen(true)}>
          Learn more
        </Button>
      </div>

      <AsyncModal open={infoOpen} onClose={() => setInfoOpen(false)} title="Simulation guidance">
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            This view translates bank transactions into a reconciliation preview. Everything you see
            is read-only: no invoices, expenses, or bank transactions were changed.
          </p>
          <p>
            Matches are explained with date proximity and amount similarity, so the next reconciliation
            step is auditable and reversible in your actual workflow.
          </p>
          <p>
            Close this preview at any time and return to the detail view. No backend reconciliations were triggered.
          </p>
        </div>
      </AsyncModal>
    </div>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-5 text-center dark:border-gray-700 dark:bg-gray-900">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
  </div>
);

const buildSimulationInsights = (transactions = []) => {
  const matches = [];
  const total = transactions.length;
  const matchCount = Math.min(MAX_MATCH_CARDS, total);

  for (let index = 0; index < matchCount; index += 1) {
    matches.push(createSimulatedMatch(transactions[index], index));
  }

  const unmatched = transactions.slice(matchCount).map((transaction, idx) => ({
    id: transaction.id ?? `unmatched-${idx}`,
    description: transaction.description || 'Bank transaction',
    date: transaction.transactionDate,
    amount: transaction.amount ?? 0,
    currency: transaction.currency || 'EUR',
  }));

  return { total, matches, unmatched };
};

const createSimulatedMatch = (transaction, index) => {
  const template = SIMULATION_INVOICE_TEMPLATES[index % SIMULATION_INVOICE_TEMPLATES.length];
  const baseDate = transaction.transactionDate ? new Date(transaction.transactionDate) : new Date();
  const invoiceDate = new Date(baseDate);
  invoiceDate.setDate(invoiceDate.getDate() + ((index % 5) - 2));

  const normalizedAmount = Math.max(0, Math.abs(transaction.amount ?? 0));
  const adjustment = normalizedAmount * (((index % 3) - 1) * 0.04);
  const invoiceAmount = Math.max(1, normalizedAmount + adjustment);
  const amountDifference = Math.abs(normalizedAmount - invoiceAmount);
  const similarity =
    invoiceAmount === 0
      ? 1
      : Math.max(0, Math.min(1, 1 - amountDifference / Math.max(invoiceAmount, 1)));

  const dateDifferenceDays = Math.round(
    Math.abs(invoiceDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const currency = transaction.currency || 'EUR';
  const explanation = `This would match ${template.number} (${template.description}) because the bank amount is within ${formatCurrency(
    amountDifference,
    currency,
  )} of the invoice and the dates are only ${dateDifferenceDays} days apart.`;

  return {
    id: transaction.id ?? `${template.number}-${index}`,
    transaction,
    invoice: {
      ...template,
      amount: invoiceAmount,
      date: invoiceDate.toISOString(),
    },
    amountDifference,
    amountSimilarityPercent: Math.round(similarity * 100),
    dateDifferenceDays,
    explanation,
  };
};

export default BankStatementReconciliationPreview;
