import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const ONBOARDING_KEY = 'sa_onboarding_progress_v1';

function getInitialStep() {
  try {
    const saved = localStorage.getItem(ONBOARDING_KEY);
    if (saved) {
      const { step } = JSON.parse(saved);
      return step || 0;
    }
  } catch (e) {
    // ignore
  }
  return 0;
}

const steps = [
  {
    title: 'Set up your company',
    description: 'Create your first company profile to get started.',
  },
  {
    title: 'Invite your team',
    description: 'Add colleagues or your accountant (optional).',
  },
  {
    title: 'Choose defaults',
    description: 'Set currency, fiscal year, and VAT mode.',
  },
  {
    title: 'Review onboarding checklist',
    description: 'Finish setup and review your configuration.',
  },
];

export default function OnboardingWizard() {
  const [step, setStep] = useState(getInitialStep());
  const [completed, setCompleted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (completed) {
      localStorage.removeItem(ONBOARDING_KEY);
      navigate('/dashboard', { replace: true });
    } else {
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ step }));
    }
  }, [step, completed, navigate]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setCompleted(true);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">Welcome to SmartAccounting™</h1>
      <Card className="mb-6">
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          {steps.map((s, idx) => (
            <li key={s.title} className={idx === step ? 'font-bold text-blue-700' : ''}>
              {s.title}
              <span className="block text-xs text-gray-500">{s.description}</span>
            </li>
          ))}
        </ol>
      </Card>
      <Card className="p-6 flex flex-col items-center">
        <h2 className="text-xl font-semibold mb-2">{steps[step].title}</h2>
        <p className="mb-6 text-gray-600">{steps[step].description}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleBack} disabled={step === 0}>Back</Button>
          <Button variant="primary" onClick={handleNext}>{step === steps.length - 1 ? 'Finish' : 'Next'}</Button>
        </div>
      </Card>
    </div>
  );
}
