import { render, screen } from '@testing-library/react';
import { AISuggestionCard } from '../components/AISuggestionCard';

describe('AISuggestionCard', () => {
  it('renders all required fields and advisory label', () => {
    const suggestion = {
      confidence: 0.95,
      explanation: 'Possible duplicate detected.',
      severity: 'high',
      relatedEntity: 'invoice',
      advisory: true,
    };

    render(<AISuggestionCard suggestion={suggestion} />);

    expect(screen.getByText(/AI Insight/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidence:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Severity:/i)).toBeInTheDocument();
    expect(screen.getByText(/Related:/i)).toBeInTheDocument();
    expect(screen.getByText(/Rationale:/i)).toBeInTheDocument();
  });
});
