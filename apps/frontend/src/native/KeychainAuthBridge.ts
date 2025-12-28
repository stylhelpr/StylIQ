/**
 * KeychainAuthBridge - Native module interface for iOS Keychain AutoFill coordination
 *
 * This module coordinates WebView navigation with iOS Keychain password autofill.
 * When a password field is focused, iOS may prompt for Face ID/Touch ID. During
 * this biometric authentication, navigation should pause to prevent race conditions.
 *
 * SECURITY GUARANTEES:
 * - This module NEVER accesses, stores, or transmits credentials
 * - All signals are one-way: WebView → Native → React Native
 * - No form data is intercepted or modified
 */

import {NativeModules, Platform} from 'react-native';

interface AuthFlowResult {
  authFlowActive: boolean;
  biometricAvailable?: boolean;
  timestamp?: number;
  durationSeconds?: number;
}

interface BiometricInfo {
  available: boolean;
  biometryType: 'faceID' | 'touchID' | 'opticID' | 'none' | 'unknown';
  errorCode: number;
  errorMessage: string;
}

interface KeychainAuthBridgeInterface {
  /**
   * Signal that a password field has been focused.
   * Call this when injected JS detects password field focus.
   */
  signalAuthFlowStarted(): Promise<AuthFlowResult>;

  /**
   * Signal that the auth flow has completed (form submitted or field blurred).
   * Call this to allow navigation to resume.
   */
  signalAuthFlowCompleted(): Promise<AuthFlowResult>;

  /**
   * Check if an auth flow is currently active.
   * Includes auto-timeout logic (30 second max).
   */
  isAuthFlowActive(): Promise<AuthFlowResult>;

  /**
   * Check device biometric capability.
   * Returns Face ID, Touch ID, or none.
   */
  checkBiometricAvailability(): Promise<BiometricInfo>;

  /**
   * Force reset the auth flow state.
   * Call on page navigation or WebView reload.
   */
  resetAuthFlow(): Promise<{reset: boolean}>;
}

// Get native module (iOS only)
const NativeKeychainAuthBridge =
  Platform.OS === 'ios'
    ? (NativeModules.KeychainAuthBridgeModule as KeychainAuthBridgeInterface)
    : null;

// Fallback implementation for Android or missing module
const FallbackKeychainAuthBridge: KeychainAuthBridgeInterface = {
  signalAuthFlowStarted: async () => ({
    authFlowActive: false,
    biometricAvailable: false,
  }),
  signalAuthFlowCompleted: async () => ({
    authFlowActive: false,
    durationSeconds: 0,
  }),
  isAuthFlowActive: async () => ({
    authFlowActive: false,
    biometricAvailable: false,
  }),
  checkBiometricAvailability: async () => ({
    available: false,
    biometryType: 'none',
    errorCode: 0,
    errorMessage: 'Not available on this platform',
  }),
  resetAuthFlow: async () => ({reset: true}),
};

/**
 * Exported KeychainAuthBridge interface.
 * Uses native module on iOS, fallback on other platforms.
 */
export const KeychainAuthBridge: KeychainAuthBridgeInterface =
  NativeKeychainAuthBridge ?? FallbackKeychainAuthBridge;

export default KeychainAuthBridge;
