import React from 'react';
import { Link } from 'react-router-dom';

import Card from '../components/Card';
import ComplianceSnapshot from '../components/ComplianceSnapshot';

const overviewCards = [
  {
    title: 'Policy guardrails',
    description:
      'Control families track GoBD, ISO, and SOC expectations so finance leaders see what is covered and what is pending.',
    meta: '3 control families',
  },
  {
    title: 'Audit readiness',
    description:
      'Data exports are available on demand and hold immutable fingerprints so regulators can verify activity without back-and-forth.',
    meta: '5 years retention',
  },
  {
    title: 'GDPR posture',
    description:
      'GDPR requests are surfaced alongside their SLA status so you can confirm subject rights are honored in time.',
    meta: 'SLA: 30 days',
  },
];

const adminLinks = [
  {
    label: 'Audit logs',
    description: 'Inspect the latest export of company-wide system activity.',
    to: '/audit-logs',
  },
  {
    label: 'GDPR actions',
    description: 'Review live GDPR requests and their completion status.',
    to: '/gdpr-actions',
  },
];

export default function ComplianceDashboard() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
          Admin center
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">Compliance Overview</h1>
        <p className="text-gray-600 max-w-3xl">
          Centralize your audit posture, monitor GDPR coverage, and access the tools your compliance team
          depends on without leaving the platform.
        </p>
      </div>

      <ComplianceSnapshot />

      <div className="grid gap-6 md:grid-cols-3">
        {overviewCards.map((card) => (
          <Card key={card.title}>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-gray-900">{card.title}</p>
              <p className="text-sm text-gray-600">{card.description}</p>
              {card.meta && (
                <p className="text-xs uppercase tracking-wider text-gray-400">{card.meta}</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Admin tools</p>
            <h2 className="text-xl font-semibold text-gray-900">Quick links</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {adminLinks.map((link) => (
            <Card key={link.label} className="flex flex-col justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">{link.label}</p>
                <p className="text-sm text-gray-600">{link.description}</p>
              </div>
              <Link
                to={link.to}
                className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Open {link.label}
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
