import Foundation
import UIKit
import LocalAuthentication

/**
 * KeychainAuthBridgeModule - Coordinates WebView navigation with iOS Keychain AutoFill
 *
 * PURPOSE:
 * iOS Keychain prompts Face ID/Touch ID when autofilling passwords. During biometric
 * authentication, the WebView may continue navigating, causing race conditions where
 * login attempts timeout before credentials are filled.
 *
 * This module:
 * 1. Tracks when a password field is focused (auth flow starting)
 * 2. Signals when auth is complete (form submitted or field blurred)
 * 3. Allows React Native to pause/resume navigation accordingly
 *
 * SECURITY GUARANTEES:
 * - NO credential access: This module never sees, stores, or transmits passwords
 * - NO form modification: Only tracks focus/blur/submit events
 * - NO biometric bypass: Uses LAContext only to detect auth availability, not to perform it
 * - Read-only observation: All signals come FROM the WebView, nothing is injected TO forms
 *
 * PRIVACY GUARANTEES:
 * - No PII is collected or transmitted
 * - Domain information used only for navigation coordination
 * - No analytics or tracking
 */
@objc(KeychainAuthBridgeModule)
class KeychainAuthBridgeModule: NSObject {

  // MARK: - State

  /// Whether a password field is currently focused (auth flow in progress)
  private var isAuthFlowActive = false

  /// Timestamp when auth flow started (for timeout handling)
  private var authFlowStartTime: Date?

  /// Maximum time to wait for auth completion before auto-resuming (30 seconds)
  private static let AUTH_TIMEOUT_SECONDS: TimeInterval = 30

  /// Whether biometric authentication is available on this device
  private var biometricAvailable: Bool {
    let context = LAContext()
    var error: NSError?
    return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
  }

  // MARK: - Auth Flow Control

  /**
   * Called when a password field receives focus in the WebView.
   * Signals that an auth flow may be starting.
   *
   * React Native should pause navigation after receiving this signal
   * to prevent race conditions with Face ID/Touch ID.
   */
  @objc
  func signalAuthFlowStarted(_ resolver: @escaping RCTPromiseResolveBlock,
                              rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }

      self.isAuthFlowActive = true
      self.authFlowStartTime = Date()

      print("[KeychainAuthBridge] Auth flow started - navigation should pause")

      resolver([
        "authFlowActive": true,
        "biometricAvailable": self.biometricAvailable,
        "timestamp": Date().timeIntervalSince1970
      ])
    }
  }

  /**
   * Called when the auth flow completes (form submitted or field blurred).
   * Signals that navigation can safely resume.
   */
  @objc
  func signalAuthFlowCompleted(_ resolver: @escaping RCTPromiseResolveBlock,
                                rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }

      let duration = self.authFlowStartTime.map { Date().timeIntervalSince($0) } ?? 0
      self.isAuthFlowActive = false
      self.authFlowStartTime = nil

      print("[KeychainAuthBridge] Auth flow completed after \(String(format: "%.2f", duration))s - navigation can resume")

      resolver([
        "authFlowActive": false,
        "durationSeconds": duration,
        "timestamp": Date().timeIntervalSince1970
      ])
    }
  }

  /**
   * Query whether an auth flow is currently active.
   * Used by React Native to determine if navigation should be paused.
   */
  @objc
  func isAuthFlowActive(_ resolver: @escaping RCTPromiseResolveBlock,
                        rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }

      // Auto-timeout check
      if self.isAuthFlowActive,
         let startTime = self.authFlowStartTime,
         Date().timeIntervalSince(startTime) > KeychainAuthBridgeModule.AUTH_TIMEOUT_SECONDS {
        print("[KeychainAuthBridge] Auth flow timed out after \(KeychainAuthBridgeModule.AUTH_TIMEOUT_SECONDS)s - auto-resuming")
        self.isAuthFlowActive = false
        self.authFlowStartTime = nil
      }

      resolver([
        "authFlowActive": self.isAuthFlowActive,
        "biometricAvailable": self.biometricAvailable
      ])
    }
  }

  /**
   * Check if the device has biometric authentication available.
   * This helps React Native decide whether to apply auth flow pausing.
   */
  @objc
  func checkBiometricAvailability(_ resolver: @escaping RCTPromiseResolveBlock,
                                   rejecter: @escaping RCTPromiseRejectBlock) {
    let context = LAContext()
    var error: NSError?
    let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)

    var biometryType = "none"
    if #available(iOS 11.0, *) {
      switch context.biometryType {
      case .faceID:
        biometryType = "faceID"
      case .touchID:
        biometryType = "touchID"
      case .opticID:
        biometryType = "opticID"
      case .none:
        biometryType = "none"
      @unknown default:
        biometryType = "unknown"
      }
    }

    resolver([
      "available": canEvaluate,
      "biometryType": biometryType,
      "errorCode": error?.code ?? 0,
      "errorMessage": error?.localizedDescription ?? ""
    ])
  }

  /**
   * Force reset the auth flow state.
   * Used when navigating away from a page or on WebView reload.
   */
  @objc
  func resetAuthFlow(_ resolver: @escaping RCTPromiseResolveBlock,
                     rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }

      self.isAuthFlowActive = false
      self.authFlowStartTime = nil

      print("[KeychainAuthBridge] Auth flow reset")

      resolver(["reset": true])
    }
  }

  // MARK: - React Native Module Requirements

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
