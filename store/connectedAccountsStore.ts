import {create} from 'zustand';
import {API_BASE_URL} from '../apps/frontend/src/config/api';

export type SocialPlatform = 'instagram' | 'tiktok' | 'pinterest' | 'threads' | 'twitter' | 'facebook' | 'linkedin';

export interface ConnectedAccount {
  platform: SocialPlatform;
  username?: string;
  isConnected: boolean;
  accountId?: string;
  connectedAt?: string;
}

interface ConnectedAccountsState {
  accounts: Record<SocialPlatform, ConnectedAccount>;
  loading: boolean;
  error: string | null;

  // Actions
  fetchConnectedAccounts: (userId: string) => Promise<void>;
  connectAccount: (userId: string, platform: SocialPlatform, oauthToken: string) => Promise<void>;
  disconnectAccount: (userId: string, platform: SocialPlatform) => Promise<void>;
  reset: () => void;
}

const initialAccounts: Record<SocialPlatform, ConnectedAccount> = {
  instagram: {platform: 'instagram', isConnected: false},
  tiktok: {platform: 'tiktok', isConnected: false},
  pinterest: {platform: 'pinterest', isConnected: false},
  threads: {platform: 'threads', isConnected: false},
  twitter: {platform: 'twitter', isConnected: false},
  facebook: {platform: 'facebook', isConnected: false},
  linkedin: {platform: 'linkedin', isConnected: false},
};

export const useConnectedAccountsStore = create<ConnectedAccountsState>((set, get) => ({
  accounts: initialAccounts,
  loading: false,
  error: null,

  // Fetch connected accounts from backend
  fetchConnectedAccounts: async (userId: string) => {
    set({loading: true, error: null});
    try {
      const response = await fetch(`${API_BASE_URL}/connected-accounts/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch connected accounts');

      const data = await response.json();
      const updatedAccounts = {...initialAccounts};

      // Update accounts with data from backend
      data.accounts?.forEach((account: ConnectedAccount) => {
        if (account.platform in updatedAccounts) {
          updatedAccounts[account.platform] = account;
        }
      });

      set({accounts: updatedAccounts, loading: false});
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      set({error: errorMsg, loading: false});
    }
  },

  // Connect a social account via OAuth
  connectAccount: async (userId: string, platform: SocialPlatform, oauthToken: string) => {
    set({loading: true, error: null});
    try {
      const response = await fetch(`${API_BASE_URL}/connected-accounts/${userId}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${oauthToken}`,
        },
        body: JSON.stringify({platform}),
      });

      if (!response.ok) throw new Error(`Failed to connect ${platform}`);

      const connectedAccount = await response.json();
      set((state) => ({
        accounts: {
          ...state.accounts,
          [platform]: connectedAccount,
        },
        loading: false,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      set({error: errorMsg, loading: false});
      throw err;
    }
  },

  // Disconnect a social account
  disconnectAccount: async (userId: string, platform: SocialPlatform) => {
    set({loading: true, error: null});
    try {
      const response = await fetch(
        `${API_BASE_URL}/connected-accounts/${userId}/disconnect/${platform}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) throw new Error(`Failed to disconnect ${platform}`);

      set((state) => ({
        accounts: {
          ...state.accounts,
          [platform]: {platform, isConnected: false},
        },
        loading: false,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      set({error: errorMsg, loading: false});
      throw err;
    }
  },

  // Reset state
  reset: () => {
    set({accounts: initialAccounts, loading: false, error: null});
  },
}));
