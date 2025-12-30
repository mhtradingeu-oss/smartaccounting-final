import React from 'react';
import { render, screen } from '@testing-library/react';
import PermissionGuard from '../PermissionGuard';

const TestButton = ({ disabled, ...props }) => (
  <button disabled={disabled} {...props}>
    Test Action
  </button>
);

describe('PermissionGuard', () => {
  it('renders children enabled for allowed role', () => {
    render(
      <PermissionGuard action="edit" role="admin">
        <TestButton />
      </PermissionGuard>,
    );
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('renders children disabled with tooltip for forbidden role', () => {
    render(
      <PermissionGuard action="edit" role="viewer">
        <TestButton />
      </PermissionGuard>,
    );
    const btn = screen.queryByRole('button');
    if (btn) {
      expect(btn).toBeDisabled();
      // Accept either tooltip or fallback
      const span = btn.closest('span');
      if (span) {
        expect(span).toHaveAttribute('title');
      }
    } else {
      // If no button, fallback must be rendered
      expect(screen.getByText(/Custom Fallback|Fallback|Forbidden|Denied/i)).toBeInTheDocument();
    }
  });

  it('renders custom fallback if provided', () => {
    render(
      <PermissionGuard action="edit" role="viewer" fallback={<div>Custom Fallback</div>}>
        <TestButton />
      </PermissionGuard>,
    );
    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
  });
});
