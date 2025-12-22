import React, { useEffect, useState } from 'react';
import { AISuggestionCard } from '../components/AISuggestionCard';
import { aiInsightsAPI } from '../services/aiInsightsAPI';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { useAuth } from '../context/AuthContext';
import { isReadOnlyRole } from '../lib/permissions';


const AIInsights = () => {
  const { user } = useAuth();
  const isReadOnly = user && isReadOnlyRole(user.role);
  // All hooks must be called before any conditional return
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    aiInsightsAPI.list()
      .then((data) => {
        setInsights(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Unknown error');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-12">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <Card className="my-8">
        <div className="flex flex-col items-center">
          <span className="text-red-600 font-semibold mb-2">{error}</span>
          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </Card>
    );
  }
  if (!insights.length) {
    return (
    <EmptyState 
      title="No AI insights available yet."
      description="AI has not generated any suggestions for your data yet."
      actionText="Refresh"
      action={() => window.location.reload()}
    />
    );
  }

  // Decision logic removed: suggestions are read-only

  // Export logic removed: suggestions are read-only

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {isReadOnly && (
        <ReadOnlyBanner message="All outputs are advisory. No actions will be taken automatically." />
      )}
      <h1 className="text-2xl font-bold mb-6">AI Suggestions <span className="text-xs font-normal text-blue-600">(Suggestion / Recommendation only)</span></h1>
      <div className="space-y-6">
        {insights.map((suggestion) => (
          <AISuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </div>
      <div className="mt-8 text-xs text-gray-500 text-center">
        <span role="img" aria-label="info">ℹ️</span> All suggestions are <span className="font-semibold text-blue-700">AI-generated recommendations</span>. No actions are taken automatically. Each suggestion references real data fields and is fully explainable. <span className="block mt-2 text-gray-400">(Audit-safe: No data is changed by AI)</span>
      </div>
    </div>
  );
};

export default AIInsights;
