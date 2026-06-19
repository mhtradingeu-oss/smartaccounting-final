import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AIManager from '../AIManager';

describe('AI Manager page', () => {
  it('renders the Phase 1 skeleton', () => {
    render(
      <MemoryRouter>
        <AIManager />
      </MemoryRouter>,
    );

    expect(screen.getByText('AI Accounting Manager')).toBeInTheDocument();
    expect(screen.getByText('Today’s Accounting Briefing')).toBeInTheDocument();
    expect(screen.getByText('Critical Alerts')).toBeInTheDocument();
    expect(screen.getByText('Next Best Actions')).toBeInTheDocument();
    expect(screen.getByText('Review Queue')).toBeInTheDocument();
    expect(screen.getByText('Ask AI Manager')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Open AI Insights/i })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /Open AI Assistant/i })).toHaveLength(2);
  });

  it('does not render write controls', () => {
    render(
      <MemoryRouter>
        <AIManager />
      </MemoryRouter>,
    );

    const forbiddenButtonNames = /approve|create invoice|upload|pay|delete|post|submit approval/i;
    expect(screen.queryByRole('button', { name: forbiddenButtonNames })).not.toBeInTheDocument();
  });
});
