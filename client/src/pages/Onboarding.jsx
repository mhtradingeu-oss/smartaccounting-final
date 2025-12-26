import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { companiesAPI } from '../services/companiesAPI';
import { Skeleton } from '../components/ui/Skeleton';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Onboarding() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasCompany, setHasCompany] = useState(false);

  useEffect(() => {
    let mounted = true;
    companiesAPI
      .list()
      .then((data) => {
        if (!mounted) {return;}
        // Accepts array or object with .companies
        const companies = Array.isArray(data)
          ? data
          : data?.companies || [];
        if (companies.length > 0) {
          setHasCompany(true);
        } else {
          setHasCompany(false);
        }
      })
      .catch((err) => {
        setError(err?.message || 'Failed to check company');
      })
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
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
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (hasCompany) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">Welcome to SmartAccounting™</h1>
      <p className="mb-6 text-gray-600">Let&apos;s get your organization set up. This onboarding flow will guide you through company creation, inviting team members, and configuring your workspace.</p>
      <Card>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Set up your company</li>
          <li>Invite your team (optional)</li>
          <li>Choose defaults (currency, fiscal year, VAT mode)</li>
          <li>Finish and review onboarding checklist</li>
        </ol>
        <div className="mt-8 flex justify-end">
          <Button variant="primary" disabled>Start Onboarding (Coming Soon)</Button>
        </div>
      </Card>
    </div>
  );
}
