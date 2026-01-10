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
      setError('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setSubmissionState('submitting');
    setError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSubmissionState('success');
    } catch (submitError) {
      setError('Ihre Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.');
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
            Zugang anfragen
          </p>
          <h1 className="text-3xl font-bold leading-snug sm:text-4xl">
            Erzählen Sie uns kurz von Ihrem Team – wir reservieren Ihren Platz.
          </h1>
          <p className="text-sm text-slate-600">
            Wir melden uns innerhalb von 24 Stunden mit Onboarding-Verfügbarkeit, Governance-Details und einer klaren Preisübersicht.
          </p>
        </header>

        <Card className="space-y-6 bg-white">
          {isSuccess ? (
            <div className="space-y-3 text-center">
              <p className="text-xl font-semibold text-slate-900">Sie sind auf der Liste!</p>
              <p className="text-sm text-slate-600">
                In Kürze erhalten Sie eine E-Mail mit den nächsten Schritten. Ihr Platz bleibt während der Prüfung der Preise reserviert.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link to="/pricing" className="inline-flex">
                  <Button size="md">Preise erneut ansehen</Button>
                </Link>
                <Link to="/" className="inline-flex">
                  <Button variant="secondary" size="md">
                    Zur Startseite
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="fullName" className="text-sm font-semibold text-slate-700">
                  Vollständiger Name
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
                  Geschäftliche E-Mail
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@unternehmen.de"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="company" className="text-sm font-semibold text-slate-700">
                  Unternehmensname
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
                  Kurzbeschreibung Ihres Bedarfs
                </label>
                <Textarea
                  id="details"
                  name="details"
                  rows={4}
                  placeholder="Teilen Sie uns mit, ob Sie mehrere Unternehmen, besondere Governance oder Integrationen benötigen."
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
                {isSubmitting ? 'Anfrage wird gesendet…' : 'Anfrage senden'}
              </Button>
            </form>
          )}
        </Card>

        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
          <p>Fragen vor der Anfrage?</p>
          <a
            href="mailto:sales@smartaccounting.de"
            className="font-semibold text-slate-900 underline-offset-4 hover:underline"
          >
            sales@smartaccounting.de kontaktieren
          </a>
        </div>
      </div>
    </div>
  );
};

export default RequestAccess;
