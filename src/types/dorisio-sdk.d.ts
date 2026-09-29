/**
 * TypeScript Declarations for dorisio-sdk and dorisio-sdk/react
 * Enables standalone frontend builds and type-checking when SDK is an uncompiled sibling.
 */

declare module 'dorisio-sdk' {
  export interface ClientConfig {
    apiUrl?: string;
    apiKey?: string;
    token?: string;
    network?: string;
    horizonUrl?: string;
    baseUrl?: string;
    [key: string]: any;
  }

  export interface CreateTipRequest {
    creatorId: string;
    amount: number;
    message?: string;
  }

  export interface TipRequest extends CreateTipRequest {}

  export interface Transaction {
    id: string;
    creatorId?: string;
    senderId?: string;
    senderUsername?: string;
    amount: number;
    message?: string;
    status: 'pending' | 'confirmed' | 'failed';
    createdAt: string;
    stellarTxHash?: string | null;
  }

  export interface Wallet {
    id: string;
    publicKey: string;
    userId?: string;
    name?: string | null;
    verified?: boolean;
    balance?: {
      available: number;
      pending: number;
      total: number;
    };
    [key: string]: any;
  }

  export class DorisioError extends Error {
    code?: string;
    constructor(message: string, code?: string);
  }

  export class DorisioClient {
    constructor(config?: ClientConfig);
    setToken(token: string | null): void;
    clearToken(): void;
    getConfig(): ClientConfig;
    getCreatorProfile(username: string): Promise<any>;
    createTip(payload: CreateTipRequest): Promise<Transaction>;
    listCreators(params?: any): Promise<any>;
    getNotifications(params?: any): Promise<any>;
    markNotificationAsRead(id: string): Promise<any>;
    markAllNotificationsAsRead(arg?: any): Promise<any>;
    [key: string]: any;
  }
}

declare module 'dorisio-sdk/react' {
  import type { ReactNode } from 'react';
  import type { DorisioClient, Transaction, Wallet, CreateTipRequest } from 'dorisio-sdk';

  export interface DorisioProviderProps {
    client: DorisioClient;
    children: ReactNode;
  }

  export function DorisioProvider(props: DorisioProviderProps): JSX.Element;

  export function useDorisio(): {
    client: DorisioClient;
    isConnected?: boolean;
    setError?: (err: any) => void;
    setIsLoading?: (loading: boolean) => void;
  };

  export function useWallet(): {
    wallets: Wallet[];
    selectedWallet?: Wallet | null;
    loading: boolean;
    error: any;
    generateNonce: () => Promise<string>;
    getChallenge: (publicKey: string) => Promise<string>;
    verifyWallet: (publicKey: any, signature?: any) => Promise<boolean>;
    listWallets: () => Promise<Wallet[]>;
    selectWallet: (walletId: any) => void;
    unlinkWallet: (walletId: string) => Promise<void>;
    renameWallet: (walletId: string, name: string) => Promise<Wallet>;
    getBalance: (walletId?: string) => Promise<any>;
    reset: () => void;
  };

  export interface UseCreateTipActions {
    createTip: (req: CreateTipRequest) => Promise<Transaction>;
    buildTransaction: () => Promise<any>;
    submitTransaction: () => Promise<any>;
    confirmTransaction: () => Promise<any>;
    reset: () => void;
  }

  export interface UseCreateTipState {
    data?: Transaction | null;
    loading: boolean;
    error: any;
    step?: string;
  }

  export function useCreateTip(): UseCreateTipActions & UseCreateTipState;

  export function useCreatorBalance(creatorId?: string): {
    balance?: {
      totalEarnings?: number;
      pendingBalance?: number;
    } | null;
    loading: boolean;
    error: any;
    fetchBalance: (creatorId: string) => Promise<any>;
    refetch?: () => Promise<any>;
    reset?: () => void;
  };

  export function useTransactionHistory(params?: { page?: number; pageSize?: number }): {
    transactions: any[];
    total: number;
    page: number;
    pageSize: number;
    loading: boolean;
    error: any;
    fetchHistory: () => Promise<any>;
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    setPageSize: (size: number) => void;
    refetch: () => Promise<any>;
    reset: () => void;
  };
}
