import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { designTokens } from '../lib/designTokens';

const heroFeatures = [
  {
    title: 'Connected cash visibility',
    description: 'Pulls bank, credit, and expense data into a single dashboard so you always know your runway.',
    tag: 'Live',
  },
  {
    title: 'Compliance & reporting',
    description: 'GDPR, Elster, and investor-ready exports built for European teams.',
    tag: 'Trusted',
  },
  {
    title: 'Stripe billing & automation',
    description: 'Generate invoices from Stripe checkout events and automate reminders.',
    tag: 'Coming soon',
  },
];

const trustBadges = ['Berlin Fintech Lab', 'Nordic Growth', 'Compact CFOs', 'Global PE Hub'];

const statHighlights = [
  { label: 'Companies onboarded', value: '320+' },
  { label: 'Avg. closing velocity', value: '2.4 days' },
  { label: 'Compliance audits passed', value: '98%' },
];

export default function Landing() {
  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900"
      style={{ fontFamily: designTokens.font.body }}
    >
      <main className="relative overflow-hidden">
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Finance for founders
              </p>
              <h1 className="text-4xl font-bold leading-tight lg:text-5xl">
                Power confident accounting decisions across finance, compliance, and billing.
              </h1>
              <p className="text-lg text-slate-600">
                SmartAccounting brings bank feeds, AI-assisted bookkeeping, detailed reports, and
                future-ready compliance into one secure workspace.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/login">
                  <Button size="lg" className="shadow-xl">
                    Sign in to the workspace
                  </Button>
                </Link>
                <Link to="/request-access" className="inline-flex">
                  <Button variant="outline" size="lg">
                    Request access
                  </Button>
                </Link>
                <Link to="/pricing" className="inline-flex">
                  <Button variant="ghost" size="lg">
                    View pricing
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <span>Working with European finance & compliance teams</span>
                <Badge color="blue">Coming soon: Austria & Spain</Badge>
              </div>
            </div>
            <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
              <p className="text-sm font-semibold uppercase text-slate-500 tracking-[0.3em]">
                Featured capabilities
              </p>
              <div className="space-y-4">
                {heroFeatures.map((feature) => (
                  <div key={feature.title} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                      <Badge color={feature.tag === 'Coming soon' ? 'yellow' : 'green'}>
                        {feature.tag}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white py-12">
          <div className="max-w-5xl mx-auto grid grid-cols-1 gap-6 text-center md:grid-cols-3">
            {statHighlights.map((stat) => (
              <div key={stat.label} className="space-y-2">
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12">
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <h2 className="text-center text-2xl font-semibold text-slate-900">Trusted by teams like yours</h2>
            <div className="grid grid-cols-2 gap-4 text-center text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 md:grid-cols-4">
              {trustBadges.map((badge) => (
                <span key={badge} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-900 py-16 text-white">
          <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-2xl font-semibold">End-to-end accounting + compliance</h3>
              <p className="mt-2 text-slate-200">
                Automate bookkeeping, monitor invoices, and lock down compliance reports without toggling multiple tools.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li>• Bank feed reconciliation with AI categorization</li>
                <li>• Audit-ready exports for investors and auditors</li>
                <li>• Billing automation wired to Stripe and German compliance</li>
              </ul>
            </div>
            <Card className="bg-slate-800 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Next steps</p>
              <p className="mt-2 text-lg text-white">Book a quick walkthrough or request early access.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/request-access" className="inline-flex w-full">
                  <Button size="md" className="w-full">
                    Request a walkthrough
                  </Button>
                </Link>
                <Link to="/pricing" className="inline-flex w-full">
                  <Button variant="secondary" size="md" className="w-full">
                    View pricing
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
