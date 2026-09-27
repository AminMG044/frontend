import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BadgeThresholdSettings } from './badge-threshold-settings';
import { BADGE_THRESHOLDS_KEY } from '@/lib/loyalty';

describe('BadgeThresholdSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds the inputs with the default thresholds', () => {
    render(<BadgeThresholdSettings creatorId="creator-1" />);

    expect(screen.getByLabelText('Bronze threshold')).toHaveValue(10);
    expect(screen.getByLabelText('Silver threshold')).toHaveValue(50);
    expect(screen.getByLabelText('Gold threshold')).toHaveValue(200);
    expect(screen.getByLabelText('Platinum threshold')).toHaveValue(500);
  });

  it('saves customized thresholds for the creator', () => {
    render(<BadgeThresholdSettings creatorId="creator-1" />);

    fireEvent.change(screen.getByLabelText('Bronze threshold'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /save thresholds/i }));

    expect(screen.getByText('Badge thresholds saved.')).toBeInTheDocument();
    expect(localStorage.getItem(BADGE_THRESHOLDS_KEY)).toContain('"bronze":25');
  });

  it('normalizes inverted input so tiers stay ascending', () => {
    render(<BadgeThresholdSettings creatorId="creator-1" />);

    fireEvent.change(screen.getByLabelText('Bronze threshold'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Silver threshold'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /save thresholds/i }));

    expect(screen.getByLabelText('Bronze threshold')).toHaveValue(100);
    expect(screen.getByLabelText('Silver threshold')).toHaveValue(101);
  });

  it('resets back to the default thresholds', () => {
    render(<BadgeThresholdSettings creatorId="creator-1" />);

    fireEvent.change(screen.getByLabelText('Gold threshold'), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: /save thresholds/i }));
    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));

    expect(screen.getByLabelText('Gold threshold')).toHaveValue(200);
    expect(screen.getByText('Reset to the default thresholds.')).toBeInTheDocument();
  });
});
