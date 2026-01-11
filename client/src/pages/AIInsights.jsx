import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AISuggestionCard } from '../components/AISuggestionCard';
import { aiInsightsAPI } from '../services/aiInsightsAPI';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import AITrustBanner from '../components/AITrustBanner';
import { AIBadge } from '../components/AIBadge';
import PlanRestrictedState from '../components/PlanRestrictedState';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { isReadOnlyRole } from '../lib/permissions';
import { isAISuggestionsEnabled } from '../lib/featureFlags';
import { formatApiError } from '../services/api';

const AIInsights = () => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const activeCompanyId = activeCompany?.id;
  const isReadOnly = user && isReadOnlyRole(user.role);
  const navigate = useNavigate();
  const aiSuggestionsEnabled = isAISuggestionsEnabled();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewerLimited, setViewerLimited] = useState(false);

  const loadInsights = useCallback(async () => {
    if (!aiSuggestionsEnabled) {
      setInsights([]);
      setViewerLimited(false);
      setError(null);
      setLoading(false);
      return;
    }
    if (!activeCompanyId) {
      setInsights([]);
      setViewerLimited(false);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setViewerLimited(false);

    try {
      const { insights: result = [], viewerLimited: limited } = await aiInsightsAPI.list({
        companyId: activeCompanyId,
      });
      setInsights(result);
      setViewerLimited(Boolean(limited));
    } catch (err) {
      setInsights([]);
      setViewerLimited(false);
      setError(formatApiError(err, 'Unable to load AI insights.'));
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, aiSuggestionsEnabled]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  useEffect(() => {
    const handleRefresh = () => {
      loadInsights();
    };
    window.addEventListener('ai-insights:refresh', handleRefresh);
    return () => window.removeEventListener('ai-insights:refresh', handleRefresh);
  }, [loadInsights]);

  if (!aiSuggestionsEnabled) {
    return (
      <EmptyState
        title="AI suggestions unavailable"
        description="This capability is disabled until approval workflows and audit guards are ready."
        help="Check back after compliance review or contact support for enablement."
      />
    );
  }

  if (loading) {
    return (
      <div className="py-12" role="status" aria-live="polite" aria-label="Loading AI insights">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (error) {
    if (error.type === 'plan_restricted') {
      return (
        <PlanRestrictedState
          feature="AI insights"
          message={error.message}
          upgradePath={error.upgradePath}
        />
      );
    }
    return (
      <EmptyState
        icon={null}
        title="Unable to load AI insights"
        description={error.message}
        action={
          <Button variant="primary" onClick={loadInsights} disabled={loading}>
            Retry
          </Button>
        }
        help={
          error.type === 'forbidden'
            ? 'Your role does not permit this AI view. Contact an admin to request access.'
            : 'If this problem continues, please contact support.'
        }
      />
    );
  }
  if (!activeCompanyId) {
    return (
      <EmptyState
        title="Select a company"
        description="AI insights are scoped to the active company."
        action={
          <Button variant="primary" onClick={() => navigate('/companies')}>
            Select company
          </Button>
        }
      />
    );
  }
  if (!insights.length) {
    return (
      <EmptyState
        title="No AI insights yet"
        description="AI has not surfaced any insights for this company yet."
        action={
          <Button variant="primary" onClick={loadInsights} disabled={loading}>
            Refresh
          </Button>
        }
        help="Next steps: upload invoices or expenses, sync bank data, or check the latest imports."
      />
    );
  }

  // Decision logic removed: suggestions are read-only

  // Export logic removed: suggestions are read-only

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {viewerLimited && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 mb-4">
          Limited insights are shown because your role is read-only. Request elevated access to see
          the full advisory feed.
        </div>
      )}
      {isReadOnly && (
        <div className="mb-6">
          <ReadOnlyBanner
            mode="Viewer"
            message="You have view-only access. AI insights are visible, but actions are disabled."
            details="Review supporting records and audit history for each insight."
          />
          <div className="flex flex-wrap gap-2 justify-center -mt-4">
            <Button variant="secondary" size="sm" onClick={() => navigate('/ai-assistant')}>
              View AI Assistant
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/audit-logs')}>
              Open Audit Logs
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/invoices')}>
              Review Related Invoices
            </Button>
          </div>
        </div>
      )}
      <div className="mb-4 flex items-center gap-3">
        <AIBadge label="AI" />
        <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          Advisory only
        </span>
        <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
      </div>
      <p className="text-sm text-gray-500">
        Receive calm, clear, and actionable AI-generated recommendations for your accounting data.
      </p>
      <AITrustBanner className="mt-4" />
      <div className="space-y-6 transition-all duration-300">
        {insights.map((suggestion) => (
          <AISuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {insights.length
          ? `${insights.length} AI insights loaded.`
          : 'No AI insights are currently available.'}
      </p>
    </div>
  );
};

export default AIInsights;
