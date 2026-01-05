import React, { useCallback, useEffect, useState } from 'react';
import { AISuggestionCard } from '../components/AISuggestionCard';
import { aiInsightsAPI } from '../services/aiInsightsAPI';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { useAuth } from '../context/AuthContext';
import { isReadOnlyRole } from '../lib/permissions';

const AIInsights = () => {
  const { user } = useAuth();
  const isReadOnly = user && isReadOnlyRole(user.role);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewerLimited, setViewerLimited] = useState(false);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    setViewerLimited(false);

    try {
      const { insights: result = [], viewerLimited: limited } = await aiInsightsAPI.list();
      setInsights(result);
      setViewerLimited(Boolean(limited));
    } catch (err) {
      setInsights([]);
      setViewerLimited(false);
      setError(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  if (loading) {
    return (
      <div
        className="py-12"
        role="status"
        aria-live="polite"
        aria-label="Loading AI insights"
      >
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        icon={null}
        title="Unable to load AI insights"
        description={error}
        action={
          <Button variant="primary" onClick={loadInsights} disabled={loading}>
            Retry
          </Button>
        }
        help="If this problem continues, please contact support."
      />
    );
  }
  if (!insights.length) {
    return (
      <EmptyState
        title="No AI insights yet"
        description="AI will generate suggestions as your data grows."
        action={
          <Button variant="primary" onClick={loadInsights} disabled={loading}>
            Refresh
          </Button>
        }
        help="AI insights are generated automatically based on your accounting data."
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
        <ReadOnlyBanner
          mode="Viewer"
          message="You have view-only access. All outputs are advisory only."
          details="No actions will be taken automatically."
        />
      )}
      <h1 className="text-2xl font-bold mb-6">
        AI Suggestions{' '}
        <span className="text-xs font-normal text-blue-600">
          (Suggestion / Recommendation only)
        </span>
      </h1>
      <div className="space-y-6">
        {insights.map((suggestion) => (
          <AISuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {insights.length
          ? `${insights.length} AI insights loaded.`
          : 'No AI insights are currently available.'}
      </p>
      <div className="mt-8 text-xs text-gray-500 text-center">
        <span role="img" aria-label="info">
          ℹ️
        </span>{' '}
        All suggestions are{' '}
        <span className="font-semibold text-blue-700">AI-generated recommendations</span>. No
        actions are taken automatically. Each suggestion references real data fields and is fully
        explainable.{' '}
        <span className="block mt-2 text-gray-400">(Audit-safe: No data is changed by AI)</span>
      </div>
    </div>
  );
};

export default AIInsights;
