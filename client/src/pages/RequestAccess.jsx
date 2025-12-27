import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { designTokens } from '../lib/designTokens';

const initialForm = {
  fullName: '',
  email: '',
  company: '',
  details: '',
};

const RequestAccess = () => {
  const [formData, setFormData] = useState(initialForm);
  const [submissionState, setSubmissionState] = useState('idle');
  const [error, setError] = useState('');

  const isSubmitting = submissionState === 'submitting';
  const isSuccess = submissionState === 'success';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.fullName || !formData.email || !formData.company) {
      setError('Please complete all required fields before submitting.');
      return;
    }

    setSubmissionState('submitting');
    setError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSubmissionState('success');
    } catch (submitError) {
      console.error('Request access submit error', submitError);
      setError('We could not process your request just yet. Please try again.');
      setSubmissionState('idle');
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-16 text-slate-900"
      style={{ fontFamily: designTokens.font.body }}
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-500">
            Request access
          </p>
          <h1 className="text-3xl font-bold leading-snug sm:text-4xl">
            Tell us about your team and we will reserve a seat for you.
          </h1>
          <p className="text-sm text-slate-600">
            We respond within 24 hours with onboarding availability, compliance guidance, and Stripe billing support.
          </p>
        </header>

        <Card className="space-y-6 bg-white">
          {isSuccess ? (
            <div className="space-y-3 text-center">
              <p className="text-xl font-semibold text-slate-900">You are on the list!</p>
              <p className="text-sm text-slate-600">
                Expect a dedicated email with next steps shortly. We will keep your spot open while you review pricing.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link to="/pricing" className="inline-flex">
                  <Button size="md">Review plans again</Button>
                </Link>
                <Link to="/" className="inline-flex">
                  <Button variant="secondary" size="md">
                    Back to landing
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="fullName" className="text-sm font-semibold text-slate-700">
                  Full name
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Alex Bauer"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  Work email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="company" className="text-sm font-semibold text-slate-700">
                  Company name
                </label>
                <Input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Smart Fintech GmbH"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="details" className="text-sm font-semibold text-slate-700">
                  What are you building?
                </label>
                <Textarea
                  id="details"
                  name="details"
                  rows={4}
                  placeholder="Tell us if you need multi-company, compliance, or Stripe billing scoping."
                  value={formData.details}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                  aria-live="assertive"
                >
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" size="md" loading={isSubmitting}>
                {isSubmitting ? 'Submitting request…' : 'Submit request'}
              </Button>
            </form>
          )}
        </Card>

        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
          <p>Have questions before you request access?</p>
          <a
            href="mailto:sales@smartaccounting.de"
            className="font-semibold text-slate-900 underline-offset-4 hover:underline"
          >
            Email sales@smartaccounting.de
          </a>
        </div>
      </div>
    </div>
  );
};

export default RequestAccess;
