import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { designTokens } from '../lib/designTokens';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '€99',
    desc: 'For solo founders and boutique finance teams.',
    features: ['Single company', 'Automated bookkeeping', 'Base compliance reports'],
    badge: 'Popular',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€249',
    desc: 'For growing agencies, accountants, and modern CFOs.',
    features: ['Multi-company roll-ups', 'Advanced cash flow', 'Live compliance alerts'],
    badge: 'Best value',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    desc: 'Invite-only, tailored for PE-backed and global firms.',
    features: ['Dedicated success partner', 'Investor-grade decks', 'Advanced audit controls'],
    badge: 'Invite only',
  },
];

const featureMatrix = [
  { feature: 'Multi-company consolidation', plans: [true, true, true] },
  { feature: 'Custom reporting templates', plans: [false, true, true] },
  { feature: 'Data export for investors / auditors', plans: [true, true, true] },
  { feature: 'Automated compliance alerts', plans: [false, true, true] },
  { feature: 'Stripe billing + hosted checkout', plans: [false, true, true], comingSoon: true },
];

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

const Pricing = () => (
  <div
    className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900"
    style={{ fontFamily: designTokens.font.body }}
  >
    <section className="px-6 py-16">
      <div className="max-w-5xl mx-auto text-center space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Transparent plans
        </p>
        <h1 className="text-4xl font-bold leading-tight">Plans built for modern finance teams.</h1>
        <p className="text-lg text-slate-600">
          Choose a plan with the speed of a startup and the controls of an enterprise. All plans include
          bank reconciliation, compliance-ready exports, and secure data retention in Germany.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/request-access" className="inline-flex">
            <Button size="lg">Request access</Button>
          </Link>
          <Link to="/" className="inline-flex">
            <Button variant="ghost" size="lg">
              Back to landing
            </Button>
          </Link>
        </div>
        {!stripeReady && (
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-700">
            <Badge color="yellow">Stripe preview</Badge>
            Stripe checkout is disabled in this environment; contact sales to flip the toggle when ready.
          </div>
        )}
      </div>
    </section>

    <section className="px-6 pb-16">
      <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="border border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{plan.name}</h2>
              <Badge color="blue">{plan.badge}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">{plan.desc}</p>
            <p className="mt-6 text-3xl font-bold text-slate-900">{plan.price}</p>
            <p className="text-sm text-slate-500">per company / month</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <CheckMark />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link to="/request-access">
                <Button className="w-full" size="md">
                  Request access
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>

    <section className="px-6 pb-20">
      <div className="max-w-6xl mx-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <h3 className="text-2xl font-semibold text-slate-900">Feature comparison</h3>
        <div className="mt-6 grid grid-cols-4 gap-4 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">Feature</span>
          {plans.map((plan) => (
            <span key={plan.id} className="font-semibold text-center text-slate-700">
              {plan.name}
            </span>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {featureMatrix.map((row) => (
            <div key={row.feature} className="grid grid-cols-4 items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">{row.feature}</span>
                {row.comingSoon && <Badge color="yellow">Coming soon</Badge>}
              </div>
              {row.plans.map((available, index) => (
                <div key={`${row.feature}-${index}`} className="flex justify-center">
                  {available ? <CheckMark /> : <span className="text-xs uppercase tracking-[0.3em]">N/A</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="px-6 pb-24">
      <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
        <h3 className="text-3xl font-semibold">Need a custom rollout?</h3>
        <p className="mt-3 text-base text-slate-200">
          Share your goals and we will design the right plan, compliance guardrails, and billing sequence for you.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/request-access" className="inline-flex">
            <Button size="md">Request a custom demo</Button>
          </Link>
          <a href="mailto:sales@smartaccounting.de" className="inline-flex">
            <Button size="md" variant="secondary">
              Email sales
            </Button>
          </a>
        </div>
      </div>
    </section>
  </div>
);

export default Pricing;
