import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DorisioButton from './dorisio-button';
import { clearDedupedRequests } from '@/lib/request-deduplicator';
import { useTipTierStore } from '@/stores/tip-tier-store';

const createTipMock = vi.fn();
let loadingState = false;

vi.mock('@/hooks/use-create-tip', () => ({
  useCreateTip: (): {
    createTip: typeof createTipMock;
    loading: boolean;
    error: null;
    tip: null;
    reset: () => void;
  } => ({
    createTip: createTipMock,
    loading: loadingState,
    error: null,
    tip: null,
    reset: vi.fn(),
  }),
}));

const mockWallets = [
  { id: 'wallet-1', publicKey: 'GABC123', name: 'Main Wallet', verified: true },
  { id: 'wallet-2', publicKey: 'GXYZ987', name: 'Trading Wallet', verified: false },
];

vi.mock('@/hooks/use-wallet', () => ({
  useWallet: (): {
    wallets: typeof mockWallets;
    getPreferredWalletId: () => string;
    setLastUsedWallet: () => void;
  } => ({
    wallets: mockWallets,
    getPreferredWalletId: (): string => 'wallet-1',
    setLastUsedWallet: vi.fn(),
  }),
}));

vi.mock('@/components/sections/wallet-selector', () => ({
  WalletSelector: ({
    value,
    onChange,
    disabled,
  }: {
    value: string | null;
    onChange: (id: string) => void;
    disabled: boolean;
  }): JSX.Element => (
    <div data-testid="wallet-selector">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid="wallet-select"
      >
        <option value="">Select wallet</option>
        {mockWallets.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
    </div>
  ),
}));

const successMock = vi.fn();
const errorMock = vi.fn();

vi.mock('@/components/notification-provider', () => ({
  useNotification: (): {
    notify: () => void;
    success: typeof successMock;
    error: typeof errorMock;
    info: () => void;
    warning: () => void;
  } => ({
    notify: vi.fn(),
    success: successMock,
    error: errorMock,
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));


describe('DorisioButton (Send Tip flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDedupedRequests();
    useTipTierStore.setState({
      tiersByCreator: {},
      recentCustomAmounts: [],
      recentCustomAmountsByCreator: {},
    });
    loadingState = false;
    createTipMock.mockReset();
    createTipMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ id: 'tip-1', status: 'success' }), 20);
        })
    );
  });

  async function openModalAndSelectAmount(
    user: ReturnType<typeof userEvent.setup>
  ): Promise<void> {
    await user.click(screen.getByRole('button', { name: /send a tip/i }));
    const walletSelect = screen.getByTestId('wallet-select');
    await user.selectOptions(walletSelect, 'wallet-1');
    await user.click(screen.getByRole('button', { name: '$5' }));
  }

  it('opens the tip modal and lets the user pick an amount', async () => {
    const user = userEvent.setup();
    render(<DorisioButton creatorId="creator-1" />);

    await user.click(screen.getByRole('button', { name: /send a tip/i }));

    expect(screen.getByText('Send a Tip')).toBeInTheDocument();

    const fiveDollarOption = screen.getByRole('button', { name: '$5' });
    await user.click(fiveDollarOption);

    expect(fiveDollarOption).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables Continue until an amount is selected (wallet is auto-selected)', async () => {
    const user = userEvent.setup();
    render(<DorisioButton creatorId="creator-1" />);

    await user.click(screen.getByRole('button', { name: /send a tip/i }));

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('calls createTip with the selected creator and amount', async () => {
    const user = userEvent.setup();
    render(<DorisioButton creatorId="creator-1" />);

    await openModalAndSelectAmount(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(createTipMock).toHaveBeenCalledWith({ creatorId: 'creator-1', amount: 5 });
    });
  });

  it('only triggers one network call on a rapid double-click of Continue', async () => {
    const user = userEvent.setup();
    render(<DorisioButton creatorId="creator-1" />);

    await openModalAndSelectAmount(user);

    const continueButton = screen.getByRole('button', { name: 'Continue' });

    await user.click(continueButton);
    await user.click(continueButton);

    await waitFor(() => {
      expect(createTipMock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows a success notification and closes the modal after a successful tip', async () => {
    const user = userEvent.setup();
    render(<DorisioButton creatorId="creator-1" />);

    await openModalAndSelectAmount(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(successMock).toHaveBeenCalledWith(expect.stringContaining('$5'), 'Thank you');
    });
    await waitFor(() => {
      expect(screen.queryByText('Send a Tip')).not.toBeInTheDocument();
    });
  });

  it('shows an error notification when the tip fails', async () => {
    createTipMock.mockRejectedValue(new Error('Insufficient funds'));
    const user = userEvent.setup();
    render(<DorisioButton creatorId="creator-1" />);

    await openModalAndSelectAmount(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(errorMock).toHaveBeenCalledWith('Insufficient funds', 'Tip failed');
    });
  });

  it('displays wallet selector in the modal', async () => {
    const user = userEvent.setup();
    render(<DorisioButton creatorId="creator-1" />);

    await user.click(screen.getByRole('button', { name: /send a tip/i }));

    expect(screen.getByTestId('wallet-selector')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-select')).toBeInTheDocument();
  });

  it('auto-selects preferred wallet when modal opens', async () => {
    const user = userEvent.setup();
    render(<DorisioButton creatorId="creator-1" />);

    await user.click(screen.getByRole('button', { name: /send a tip/i }));

    const walletSelect = screen.getByTestId('wallet-select') as HTMLSelectElement;
    expect(walletSelect.value).toBe('wallet-1');
  });

  it('allows switching wallets before sending tip', async () => {
    const user = userEvent.setup();
    render(<DorisioButton creatorId="creator-1" />);

    await user.click(screen.getByRole('button', { name: /send a tip/i }));

    const walletSelect = screen.getByTestId('wallet-select');
    await user.selectOptions(walletSelect, 'wallet-2');

    expect((walletSelect as HTMLSelectElement).value).toBe('wallet-2');
  });

  describe('Tipping Tier Preset Amounts & Custom Flow', () => {
    it('displays preset tip buttons in order: low to high', async () => {
      const user = userEvent.setup();
      // Unsorted creator tiers
      useTipTierStore.getState().setTipTiers('creator-custom', [50, 2, 20, 5]);

      render(<DorisioButton creatorId="creator-custom" />);
      await user.click(screen.getByRole('button', { name: /send a tip/i }));

      const presetContainer = screen.getByLabelText('Preset tip amounts');
      const buttons = presetContainer.querySelectorAll('button');
      const buttonTexts = Array.from(buttons)
        .map((b) => b.textContent?.trim())
        .filter((t) => t?.startsWith('$'));

      expect(buttonTexts).toEqual(['$2', '$5', '$20', '$50']);
    });

    it('supports 4 to 6 preset buttons in mobile layout', async () => {
      const user = userEvent.setup();
      useTipTierStore.getState().setTipTiers('creator-6', [1, 3, 5, 10, 25, 50]);

      render(<DorisioButton creatorId="creator-6" />);
      await user.click(screen.getByRole('button', { name: /send a tip/i }));

      const presetContainer = screen.getByLabelText('Preset tip amounts');
      expect(presetContainer).toHaveClass('grid');
      // 6 preset buttons + 1 Custom button
      expect(presetContainer.querySelectorAll('button')).toHaveLength(7);
    });

    it('allows entering a custom tip amount', async () => {
      const user = userEvent.setup();
      render(<DorisioButton creatorId="creator-1" />);

      await user.click(screen.getByRole('button', { name: /send a tip/i }));

      // Click Custom
      const customButton = screen.getByRole('button', { name: 'Custom' });
      await user.click(customButton);
      expect(customButton).toHaveAttribute('aria-pressed', 'true');

      // Enter amount
      const customInput = screen.getByLabelText('Custom tip amount');
      await user.type(customInput, '17.5');

      // Continue should be enabled
      const continueButton = screen.getByRole('button', { name: 'Continue' });
      expect(continueButton).not.toBeDisabled();

      // Submit tip
      await user.click(continueButton);

      await waitFor(() => {
        expect(createTipMock).toHaveBeenCalledWith({ creatorId: 'creator-1', amount: 17.5 });
      });
    });

    it('shows validation error for invalid custom amount and disables Continue', async () => {
      const user = userEvent.setup();
      render(<DorisioButton creatorId="creator-1" />);

      await user.click(screen.getByRole('button', { name: /send a tip/i }));
      await user.click(screen.getByRole('button', { name: 'Custom' }));

      const customInput = screen.getByLabelText('Custom tip amount');
      await user.type(customInput, '-5');

      expect(
        screen.getByText('Please enter an amount greater than $0')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });

    it('remembers recent custom tips (last 3 used) and allows quick selection', async () => {
      const user = userEvent.setup();
      // Pre-seed 3 recent custom amounts
      useTipTierStore.getState().addRecentCustomAmount(7, 'creator-1');
      useTipTierStore.getState().addRecentCustomAmount(14, 'creator-1');
      useTipTierStore.getState().addRecentCustomAmount(21, 'creator-1');

      render(<DorisioButton creatorId="creator-1" />);
      await user.click(screen.getByRole('button', { name: /send a tip/i }));

      expect(screen.getByLabelText('Recent custom tips')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Recent tip $21' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Recent tip $14' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Recent tip $7' })).toBeInTheDocument();

      // Click recent tip chip
      await user.click(screen.getByRole('button', { name: 'Recent tip $14' }));

      const continueButton = screen.getByRole('button', { name: 'Continue' });
      expect(continueButton).not.toBeDisabled();

      await user.click(continueButton);

      await waitFor(() => {
        expect(createTipMock).toHaveBeenCalledWith({ creatorId: 'creator-1', amount: 14 });
      });
    });

    it('uses tipTiers prop when passed to DorisioButton', async () => {
      const user = userEvent.setup();
      render(<DorisioButton creatorId="creator-prop" tipTiers={[100, 15, 30]} />);

      await user.click(screen.getByRole('button', { name: /send a tip/i }));

      const presetContainer = screen.getByLabelText('Preset tip amounts');
      const buttons = presetContainer.querySelectorAll('button');
      const buttonTexts = Array.from(buttons)
        .map((b) => b.textContent?.trim())
        .filter((t) => t?.startsWith('$'));

      expect(buttonTexts).toEqual(['$15', '$30', '$100']);
    });
  });
});
