import {NativeModules} from 'react-native';

export interface SavedPasswordEntry {
  id: string;
  domain: string;
  username: string;
  savedAt: number;
}

export interface SavedPasswordWithCredential extends SavedPasswordEntry {
  password: string;
}

interface KeychainModuleType {
  /**
   * Saves a password securely to iOS Keychain
   * @returns The saved password entry (without the password itself for security)
   */
  savePassword(
    domain: string,
    username: string,
    password: string,
  ): Promise<SavedPasswordEntry>;

  /**
   * Retrieves a password for a specific domain
   * Uses partial matching for subdomains
   * @returns The full password data or null if not found
   */
  getPasswordForDomain(
    domain: string,
  ): Promise<SavedPasswordWithCredential | null>;

  /**
   * Gets all saved passwords (without the actual password values for security)
   * @returns Array of password entries
   */
  getAllPasswords(): Promise<SavedPasswordEntry[]>;

  /**
   * Removes a specific password by ID
   */
  removePassword(id: string): Promise<boolean>;

  /**
   * Updates an existing password
   */
  updatePassword(
    id: string,
    domain: string,
    username: string,
    password: string,
  ): Promise<SavedPasswordEntry>;

  /**
   * Clears all saved passwords from Keychain
   */
  clearAllPasswords(): Promise<boolean>;
}

const {KeychainModule} = NativeModules;

export default KeychainModule as KeychainModuleType;
