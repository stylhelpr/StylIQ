import {useState, useEffect, useCallback} from 'react';
import KeychainModule, {
  SavedPasswordEntry,
  SavedPasswordWithCredential,
} from '../native/KeychainModule';

/**
 * Hook for managing passwords securely using iOS Keychain
 * This replaces the insecure AsyncStorage-based password storage
 */
export function useSecurePasswords() {
  const [savedPasswords, setSavedPasswords] = useState<SavedPasswordEntry[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all passwords on mount
  const loadPasswords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const passwords = await KeychainModule.getAllPasswords();
      setSavedPasswords(passwords || []);
    } catch (err) {
      console.error('Failed to load passwords from Keychain:', err);
      setError('Failed to load saved passwords');
      setSavedPasswords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPasswords();
  }, [loadPasswords]);

  // Save a new password
  const addPassword = useCallback(
    async (
      domain: string,
      username: string,
      password: string,
    ): Promise<SavedPasswordEntry | null> => {
      try {
        setError(null);
        const entry = await KeychainModule.savePassword(
          domain,
          username,
          password,
        );
        // Refresh the list
        await loadPasswords();
        return entry;
      } catch (err) {
        console.error('Failed to save password to Keychain:', err);
        setError('Failed to save password');
        return null;
      }
    },
    [loadPasswords],
  );

  // Get password for a domain (for autofill)
  const getPasswordForDomain = useCallback(
    async (domain: string): Promise<SavedPasswordWithCredential | null> => {
      try {
        setError(null);
        const password = await KeychainModule.getPasswordForDomain(domain);
        return password;
      } catch (err) {
        console.error('Failed to get password from Keychain:', err);
        setError('Failed to retrieve password');
        return null;
      }
    },
    [],
  );

  // Remove a password
  const removePassword = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);
        await KeychainModule.removePassword(id);
        // Refresh the list
        await loadPasswords();
        return true;
      } catch (err) {
        console.error('Failed to remove password from Keychain:', err);
        setError('Failed to remove password');
        return false;
      }
    },
    [loadPasswords],
  );

  // Update an existing password
  const updatePassword = useCallback(
    async (
      id: string,
      domain: string,
      username: string,
      password: string,
    ): Promise<SavedPasswordEntry | null> => {
      try {
        setError(null);
        const entry = await KeychainModule.updatePassword(
          id,
          domain,
          username,
          password,
        );
        // Refresh the list
        await loadPasswords();
        return entry;
      } catch (err) {
        console.error('Failed to update password in Keychain:', err);
        setError('Failed to update password');
        return null;
      }
    },
    [loadPasswords],
  );

  // Clear all passwords
  const clearAllPasswords = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      await KeychainModule.clearAllPasswords();
      setSavedPasswords([]);
      return true;
    } catch (err) {
      console.error('Failed to clear passwords from Keychain:', err);
      setError('Failed to clear passwords');
      return false;
    }
  }, []);

  return {
    savedPasswords,
    isLoading,
    error,
    addPassword,
    getPasswordForDomain,
    removePassword,
    updatePassword,
    clearAllPasswords,
    refreshPasswords: loadPasswords,
  };
}
