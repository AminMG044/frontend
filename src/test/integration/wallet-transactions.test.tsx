import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * Domain types for wallet transaction and payment processing flows
 */
export interface WalletAccount {
  id: string;
  publicKey: string;
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;
}

export interface TipTransactionRequest {
  id: string;
  senderId: string;
  creatorId: string;
  amount: number;
  fee: number;
  message?: string;
  status: 'pending' | 'submitting' | 'confirmed' | 'failed' | 'refunded';
  stellarTxHash?: string;
  createdAt: string;
  error?: string;
}

export interface CreatorLedger {
  creatorId: string;
  totalEarnings: number;
  pendingEarnings: number;
  availableEarnings: number;
  transactionCount: number;
}

/**
 * Wallet Transaction Processor Engine
 * Handles payment lifecycle: validation -> lock -> optimistic deduction -> submission -> confirmation / reversal
 */
export class WalletTransactionProcessor {
  private senderWallet: WalletAccount;
  private creatorLedger: CreatorLedger;
  private transactionHistory: TipTransactionRequest[] = [];
  private isProcessingLock = false;

  constructor(senderInitialBalance = 500, creatorInitialEarnings = 100) {
    this.senderWallet = {
      id: 'wallet_sender_main',
      publicKey: 'G_SENDER_PUBLIC_KEY_123',
      availableBalance: senderInitialBalance,
      pendingBalance: 0,
      totalBalance: senderInitialBalance,
    };

    this.creatorLedger = {
      creatorId: 'creator_dorisio_1',
      totalEarnings: creatorInitialEarnings,
      pendingEarnings: 0,
      availableEarnings: creatorInitialEarnings,
      transactionCount: 0,
    };
  }

  getSenderWallet(): WalletAccount {
    return { ...this.senderWallet };
  }

  getCreatorLedger(): CreatorLedger {
    return { ...this.creatorLedger };
  }

  getTransactionHistory(): TipTransactionRequest[] {
    return [...this.transactionHistory];
  }

  /**
   * Executes a tip payment transaction end-to-end
   */
  async processTipTransaction(params: {
    creatorId: string;
    amount: number;
    fee?: number;
    message?: string;
    mockSubmissionResult?: 'success' | 'network_error' | 'blockchain_timeout' | 'invalid_signature';
  }): Promise<TipTransactionRequest> {
    const { creatorId, amount, fee = 0.01, message, mockSubmissionResult = 'success' } = params;
    const totalDeduction = amount + fee;

    // 1. Concurrency handling lock
    while (this.isProcessingLock) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    this.isProcessingLock = true;

    // 2. Validation inside critical section
    if (amount <= 0) {
      this.isProcessingLock = false;
      throw new Error('Tip amount must be greater than zero');
    }
    if (this.senderWallet.availableBalance < totalDeduction) {
      this.isProcessingLock = false;
      throw new Error('Insufficient wallet balance for tip and network fee');
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const txRecord: TipTransactionRequest = {
      id: txId,
      senderId: this.senderWallet.id,
      creatorId,
      amount,
      fee,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // 3. Optimistic Balance Updates
    this.senderWallet.availableBalance -= totalDeduction;
    this.senderWallet.pendingBalance += totalDeduction;
    this.creatorLedger.pendingEarnings += amount;

    try {
      // 4. Simulate Stellar Blockchain Submission
      txRecord.status = 'submitting';

      if (mockSubmissionResult === 'network_error') {
        throw new Error('Network error. Please check your connection and try again.');
      }
      if (mockSubmissionResult === 'blockchain_timeout') {
        throw new Error('Blockchain confirmation timed out.');
      }
      if (mockSubmissionResult === 'invalid_signature') {
        throw new Error('Wallet verification failed: the signature is invalid.');
      }

      // Success Path
      txRecord.status = 'confirmed';
      txRecord.stellarTxHash = `stellar_hash_${Math.random().toString(36).substring(2, 12)}`;

      // Finalize balances
      this.senderWallet.pendingBalance -= totalDeduction;
      this.senderWallet.totalBalance -= totalDeduction;

      this.creatorLedger.pendingEarnings -= amount;
      this.creatorLedger.totalEarnings += amount;
      this.creatorLedger.availableEarnings += amount;
      this.creatorLedger.transactionCount += 1;

      this.transactionHistory.unshift(txRecord);
      return txRecord;
    } catch (err: any) {
      // 5. Refund & Reversal Flow upon Failure
      txRecord.status = 'failed';
      txRecord.error = err.message;

      // Revert optimistic sender balance deductions
      this.senderWallet.availableBalance += totalDeduction;
      this.senderWallet.pendingBalance -= totalDeduction;

      // Revert creator pending balance
      this.creatorLedger.pendingEarnings -= amount;

      this.transactionHistory.unshift(txRecord);
      throw err;
    } finally {
      this.isProcessingLock = false;
    }
  }

  /**
   * Process refund/reversal on an existing transaction
   */
  async refundTransaction(txId: string): Promise<TipTransactionRequest> {
    const tx = this.transactionHistory.find((t) => t.id === txId);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.status !== 'confirmed') {
      throw new Error(`Cannot refund transaction with status: ${tx.status}`);
    }

    const refundAmount = tx.amount;
    this.senderWallet.availableBalance += refundAmount;
    this.senderWallet.totalBalance += refundAmount;

    this.creatorLedger.totalEarnings -= refundAmount;
    this.creatorLedger.availableEarnings -= refundAmount;

    tx.status = 'refunded';
    return tx;
  }
}

describe('Wallet Transactions and Payment Flow Integration Tests', () => {
  let processor: WalletTransactionProcessor;

  beforeEach(() => {
    processor = new WalletTransactionProcessor(200, 50);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. End-to-End Transaction Flow', () => {
    it('executes a tip payment and updates balances & records', async () => {
      const tipAmount = 25;
      const fee = 0.01;

      const tx = await processor.processTipTransaction({
        creatorId: 'creator_dorisio_1',
        amount: tipAmount,
        fee,
        message: 'Keep making awesome content!',
      });

      expect(tx.status).toBe('confirmed');
      expect(tx.stellarTxHash).toBeDefined();
      expect(tx.stellarTxHash).toMatch(/^stellar_hash_/);
      expect(tx.amount).toBe(25);
      expect(tx.message).toBe('Keep making awesome content!');

      // Verify sender balance after confirmed tip
      const sender = processor.getSenderWallet();
      expect(sender.availableBalance).toBeCloseTo(200 - 25.01, 2);
      expect(sender.totalBalance).toBeCloseTo(200 - 25.01, 2);
      expect(sender.pendingBalance).toBe(0);

      // Verify creator ledger updates
      const creator = processor.getCreatorLedger();
      expect(creator.totalEarnings).toBe(75);
      expect(creator.availableEarnings).toBe(75);
      expect(creator.pendingEarnings).toBe(0);
      expect(creator.transactionCount).toBe(1);

      // Verify transaction record exists in history
      const history = processor.getTransactionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(tx.id);
      expect(history[0].creatorId).toBe('creator_dorisio_1');
    });

    it('rejects invalid tip amounts <= 0', async () => {
      await expect(
        processor.processTipTransaction({
          creatorId: 'creator_1',
          amount: 0,
        })
      ).rejects.toThrow('Tip amount must be greater than zero');

      await expect(
        processor.processTipTransaction({
          creatorId: 'creator_1',
          amount: -10,
        })
      ).rejects.toThrow('Tip amount must be greater than zero');
    });

    it('rejects transaction when wallet balance is insufficient', async () => {
      await expect(
        processor.processTipTransaction({
          creatorId: 'creator_1',
          amount: 500, // available is only 200
        })
      ).rejects.toThrow('Insufficient wallet balance');

      const sender = processor.getSenderWallet();
      expect(sender.availableBalance).toBe(200);
      expect(processor.getTransactionHistory()).toHaveLength(0);
    });
  });

  describe('2. Refund and Reversal Flows', () => {
    it('rolls back balances when payment processor throws network error', async () => {
      await expect(
        processor.processTipTransaction({
          creatorId: 'creator_1',
          amount: 30,
          mockSubmissionResult: 'network_error',
        })
      ).rejects.toThrow('Network error');

      // Balances must be fully restored
      const sender = processor.getSenderWallet();
      expect(sender.availableBalance).toBe(200);
      expect(sender.pendingBalance).toBe(0);

      const creator = processor.getCreatorLedger();
      expect(creator.totalEarnings).toBe(50);
      expect(creator.pendingEarnings).toBe(0);

      // History should record the failed transaction
      const history = processor.getTransactionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('failed');
      expect(history[0].error).toContain('Network error');
    });

    it('handles blockchain confirmation timeout reversal', async () => {
      await expect(
        processor.processTipTransaction({
          creatorId: 'creator_1',
          amount: 15,
          mockSubmissionResult: 'blockchain_timeout',
        })
      ).rejects.toThrow('Blockchain confirmation timed out');

      const sender = processor.getSenderWallet();
      expect(sender.availableBalance).toBe(200);

      const history = processor.getTransactionHistory();
      expect(history[0].status).toBe('failed');
      expect(history[0].error).toContain('timed out');
    });

    it('handles invalid wallet signature failure and rolls back', async () => {
      await expect(
        processor.processTipTransaction({
          creatorId: 'creator_1',
          amount: 10,
          mockSubmissionResult: 'invalid_signature',
        })
      ).rejects.toThrow('signature is invalid');

      const sender = processor.getSenderWallet();
      expect(sender.availableBalance).toBe(200);
    });

    it('executes full post-confirmation refund on confirmed transaction', async () => {
      const tx = await processor.processTipTransaction({
        creatorId: 'creator_1',
        amount: 50,
        fee: 0.01,
      });

      expect(processor.getSenderWallet().availableBalance).toBeCloseTo(149.99, 2);
      expect(processor.getCreatorLedger().totalEarnings).toBe(100);

      const refundedTx = await processor.refundTransaction(tx.id);
      expect(refundedTx.status).toBe('refunded');

      // Sender balance credited back
      expect(processor.getSenderWallet().availableBalance).toBeCloseTo(199.99, 2);
      // Creator earnings reduced
      expect(processor.getCreatorLedger().totalEarnings).toBe(50);
    });
  });

  describe('3. Concurrent Transaction Handling', () => {
    it('processes multiple simultaneous tips sequentially without double-spend or corrupted balances', async () => {
      // Dispatch 3 concurrent transactions
      const [tx1, tx2, tx3] = await Promise.all([
        processor.processTipTransaction({ creatorId: 'creator_1', amount: 20 }),
        processor.processTipTransaction({ creatorId: 'creator_1', amount: 30 }),
        processor.processTipTransaction({ creatorId: 'creator_1', amount: 50 }),
      ]);

      expect(tx1.status).toBe('confirmed');
      expect(tx2.status).toBe('confirmed');
      expect(tx3.status).toBe('confirmed');

      const totalTip = 20 + 30 + 50; // 100
      const totalFees = 0.01 * 3; // 0.03

      const sender = processor.getSenderWallet();
      expect(sender.availableBalance).toBeCloseTo(200 - totalTip - totalFees, 2);
      expect(sender.pendingBalance).toBe(0);

      const creator = processor.getCreatorLedger();
      expect(creator.totalEarnings).toBe(50 + 100);
      expect(creator.transactionCount).toBe(3);

      expect(processor.getTransactionHistory()).toHaveLength(3);
    });

    it('safely rejects remaining concurrent transactions when cumulative balance runs out', async () => {
      // Total available: 200. Fire 3 transactions of 90 (90.01 with fee) each.
      // 1st: 90.01 -> balance 109.99
      // 2nd: 90.01 -> balance 19.98
      // 3rd: needs 90.01, balance 19.98 -> rejected for insufficient balance
      const results = await Promise.allSettled([
        processor.processTipTransaction({ creatorId: 'creator_1', amount: 90 }),
        processor.processTipTransaction({ creatorId: 'creator_1', amount: 90 }),
        processor.processTipTransaction({ creatorId: 'creator_1', amount: 90 }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // First two succeed, third fails with insufficient balance
      expect(fulfilled).toHaveLength(2);
      expect(rejected).toHaveLength(1);

      const sender = processor.getSenderWallet();
      expect(sender.availableBalance).toBeLessThan(90); // Remaining balance cannot afford another 90 tip
      expect(sender.availableBalance).toBeGreaterThanOrEqual(0); // Never negative!
    });
  });
});
