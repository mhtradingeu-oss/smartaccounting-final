import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { designTokens } from '../lib/designTokens';
import { fetchPublicPlans } from '../services/plansAPI';

const stripeReady = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckMark = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 text-emerald-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const formatCurrency = (cents, currency = 'EUR') =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);

const formatPrice = (price) => {
  if (!price || price.monthlyCents === null || price.monthlyCents === undefined) {
    return 'Individuell';
  }
  if (price.monthlyCents === 0) {
    return 'Kostenlos';
  }
  return formatCurrency(price.monthlyCents, price.currency);
};

const formatAnnualPrice = (price) => {
  if (!price || price.yearlyCents === null || price.yearlyCents === undefined) {
    return null;
  }
  if (price.yearlyCents === 0) {
    return 'Kostenlos';
  }
  return formatCurrency(price.yearlyCents, price.currency);
};

const Pricing = () => {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchPublicPlans()
      .then((data) => {
        if (isMounted) {
          setPayload(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const copy = useMemo(() => payload?.copy || null, [payload]);
  const plans = useMemo(() => payload?.plans || [], [payload]);
  const featureMatrix = useMemo(() => payload?.featureMatrix || [], [payload]);

  const planOrder = useMemo(() => plans.map((plan) => plan.id), [plans]);
  const hasPlans = plans.length > 0;
  const columnCount = hasPlans ? plans.length + 1 : 4;
  const gridColumnClass = useMemo(() => {
    switch (columnCount) {
      case 5:
        return 'grid-cols-5';
      case 4:
        return 'grid-cols-4';
      case 3:
        return 'grid-cols-3';
      default:
        return 'grid-cols-4';
    }
  }, [columnCount]);

  if (loading && !payload) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 flex items-center justify-center"
        style={{ fontFamily: designTokens.font.body }}
      >
        <div className="text-sm text-slate-500">Planinformationen werden geladen.</div>
      </div>
    );
  }

  if ((!copy || error) && !payload) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 flex items-center justify-center"
        style={{ fontFamily: designTokens.font.body }}
      >
        <div className="text-sm text-slate-600">
          Planinformationen sind derzeit nicht verfuegbar. Bitte kontaktieren Sie uns fuer Details.
        </div>
      </div>
    );
  }

  if (!copy) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 flex items-center justify-center"
        style={{ fontFamily: designTokens.font.body }}
      >
        <div className="text-sm text-slate-600">
          Planinformationen sind derzeit nicht verfuegbar. Bitte kontaktieren Sie uns fuer Details.
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900"
      style={{ fontFamily: designTokens.font.body }}
    >
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            {copy.eyebrow}
          </p>
          <h1 className="text-4xl font-bold leading-tight">{copy.headline}</h1>
          <p className="text-lg text-slate-600">{copy.subhead}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/request-access" className="inline-flex">
              <Button size="lg">{copy.ctaPrimary}</Button>
            </Link>
            <Link to="/" className="inline-flex">
              <Button variant="ghost" size="lg">
                {copy.ctaSecondary}
              </Button>
            </Link>
          </div>
          {!stripeReady && (
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-700">
              <Badge color="yellow">Abrechnungsvorschau</Badge>
              Stripe Checkout ist in dieser Umgebung deaktiviert; Vertriebsfreigabe erfolgt manuell.
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-600">
            {copy.trustHighlights?.map((item) => (
              <span key={item} className="rounded-full border border-slate-200 px-3 py-1">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {hasPlans ? (
            plans.map((plan) => (
              <Card key={plan.id} className="border border-slate-200 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">{plan.name}</h2>
                  <Badge color="blue">{plan.badge}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
                <p className="mt-6 text-3xl font-bold text-slate-900">{formatPrice(plan.price)}</p>
                <p className="text-sm text-slate-500">{plan.billingUnit}</p>
                {formatAnnualPrice(plan.price) && (
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                    Jährlich {formatAnnualPrice(plan.price)}
                  </p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div>
                    <div className="font-semibold text-slate-900">Nutzer</div>
                    <div>{plan.included?.users ?? 'Individuell'}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Unternehmen</div>
                    <div>{plan.included?.companies ?? 'Individuell'}</div>
                  </div>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-slate-600">
                  {plan.highlights?.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckMark />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <div className="font-semibold text-slate-900">Rahmen & Limits</div>
                  <ul className="mt-2 space-y-1">
                    {plan.limits?.map((limit) => (
                      <li key={limit}>{limit}</li>
                    ))}
                    {!plan.limits?.length && <li>Rahmenbedingungen auf Anfrage.</li>}
                  </ul>
                </div>
                {plan.trial?.label && (
                  <p className="mt-4 text-xs text-slate-500">{plan.trial.label}</p>
                )}
                <div className="mt-6">
                  <Link to={plan.cta?.path || '/request-access'}>
                    <Button className="w-full" size="md">
                      {plan.cta?.label || copy.ctaPrimary}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))
          ) : (
            <Card className="border border-slate-200 bg-white md:col-span-3">
              <p className="text-sm text-slate-600">
                {error
                  ? 'Planinformationen sind gerade nicht verfügbar. Bitte kontaktieren Sie uns für Details.'
                  : 'Planinformationen werden geladen.'}
              </p>
            </Card>
          )}
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <h3 className="text-2xl font-semibold text-slate-900">{copy.comparisonTitle}</h3>
          <p className="mt-2 text-sm text-slate-500">{copy.comparisonNote}</p>
          <div className={`mt-6 grid ${gridColumnClass} gap-4 text-sm text-slate-500`}>
            <span className="font-semibold text-slate-700">Funktion</span>
            {plans.map((plan) => (
              <span key={plan.id} className="font-semibold text-center text-slate-700">
                {plan.name}
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {featureMatrix.map((row) => (
              <div
                key={row.key}
                className={`grid ${gridColumnClass} items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-slate-600`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{row.label}</span>
                </div>
                {row.availability.map((available, index) => (
                  <div key={`${row.key}-${planOrder[index]}`} className="flex justify-center">
                    {available ? (
                      <CheckMark />
                    ) : (
                      <span className="text-xs uppercase tracking-[0.3em]">N/A</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          <div className="space-y-2">
            {copy.legalNotes?.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
          <h3 className="text-3xl font-semibold">{copy.customTitle}</h3>
          <p className="mt-3 text-base text-slate-200">{copy.customBody}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/request-access" className="inline-flex">
              <Button size="md">{copy.customCta}</Button>
            </Link>
            <a href={`mailto:${copy.customEmail}`} className="inline-flex">
              <Button size="md" variant="secondary">
                E-Mail senden
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
