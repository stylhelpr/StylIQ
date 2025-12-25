import Foundation
import Security

@objc(KeychainModule)
class KeychainModule: NSObject {

  private let service = "com.styliq.browser.passwords"

  // MARK: - Password Storage

  @objc
  func savePassword(_ domain: String, username: String, password: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    let id = "pwd_\(Int(Date().timeIntervalSince1970 * 1000))"
    let account = "\(domain):\(username)"

    // Check if password already exists for this domain/username
    let existingQuery: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account
    ]

    // Delete existing entry if present
    SecItemDelete(existingQuery as CFDictionary)

    // Create password data with metadata
    let passwordData: [String: Any] = [
      "id": id,
      "domain": domain,
      "username": username,
      "password": password,
      "savedAt": Int(Date().timeIntervalSince1970 * 1000)
    ]

    guard let jsonData = try? JSONSerialization.data(withJSONObject: passwordData),
          let jsonString = String(data: jsonData, encoding: .utf8) else {
      rejecter("SERIALIZATION_ERROR", "Failed to serialize password data", nil)
      return
    }

    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecValueData as String: jsonString.data(using: .utf8)!,
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    ]

    let status = SecItemAdd(query as CFDictionary, nil)

    if status == errSecSuccess {
      resolver([
        "id": id,
        "domain": domain,
        "username": username,
        "savedAt": Int(Date().timeIntervalSince1970 * 1000)
      ])
    } else {
      rejecter("KEYCHAIN_ERROR", "Failed to save password to Keychain (status: \(status))", nil)
    }
  }

  @objc
  func getPasswordForDomain(_ domain: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecMatchLimit as String: kSecMatchLimitAll,
      kSecReturnAttributes as String: true,
      kSecReturnData as String: true
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    if status == errSecSuccess, let items = result as? [[String: Any]] {
      for item in items {
        guard let account = item[kSecAttrAccount as String] as? String,
              let data = item[kSecValueData as String] as? Data,
              let jsonString = String(data: data, encoding: .utf8),
              let jsonData = jsonString.data(using: .utf8),
              let passwordData = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
              let storedDomain = passwordData["domain"] as? String else {
          continue
        }

        // Match domain (partial match for subdomains)
        if storedDomain.contains(domain) || domain.contains(storedDomain) {
          resolver([
            "id": passwordData["id"] ?? "",
            "domain": storedDomain,
            "username": passwordData["username"] ?? "",
            "password": passwordData["password"] ?? "",
            "savedAt": passwordData["savedAt"] ?? 0
          ])
          return
        }
      }
    }

    // No password found
    resolver(NSNull())
  }

  @objc
  func getAllPasswords(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecMatchLimit as String: kSecMatchLimitAll,
      kSecReturnAttributes as String: true,
      kSecReturnData as String: true
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    var passwords: [[String: Any]] = []

    if status == errSecSuccess, let items = result as? [[String: Any]] {
      for item in items {
        guard let data = item[kSecValueData as String] as? Data,
              let jsonString = String(data: data, encoding: .utf8),
              let jsonData = jsonString.data(using: .utf8),
              let passwordData = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
          continue
        }

        // Return without password for listing (security)
        passwords.append([
          "id": passwordData["id"] ?? "",
          "domain": passwordData["domain"] ?? "",
          "username": passwordData["username"] ?? "",
          "savedAt": passwordData["savedAt"] ?? 0
        ])
      }
    }

    resolver(passwords)
  }

  @objc
  func removePassword(_ id: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    // First, find the password with this ID to get the account key
    let searchQuery: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecMatchLimit as String: kSecMatchLimitAll,
      kSecReturnAttributes as String: true,
      kSecReturnData as String: true
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(searchQuery as CFDictionary, &result)

    if status == errSecSuccess, let items = result as? [[String: Any]] {
      for item in items {
        guard let account = item[kSecAttrAccount as String] as? String,
              let data = item[kSecValueData as String] as? Data,
              let jsonString = String(data: data, encoding: .utf8),
              let jsonData = jsonString.data(using: .utf8),
              let passwordData = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
              let storedId = passwordData["id"] as? String else {
          continue
        }

        if storedId == id {
          let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
          ]

          let deleteStatus = SecItemDelete(deleteQuery as CFDictionary)
          if deleteStatus == errSecSuccess || deleteStatus == errSecItemNotFound {
            resolver(true)
          } else {
            rejecter("DELETE_ERROR", "Failed to delete password (status: \(deleteStatus))", nil)
          }
          return
        }
      }
    }

    // Password not found, consider it successfully deleted
    resolver(true)
  }

  @objc
  func updatePassword(_ id: String, domain: String, username: String, password: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    // First remove the old password, then save new one
    removePassword(id, resolver: { [weak self] _ in
      self?.savePassword(domain, username: username, password: password, resolver: resolver, rejecter: rejecter)
    }, rejecter: rejecter)
  }

  @objc
  func clearAllPasswords(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service
    ]

    let status = SecItemDelete(query as CFDictionary)

    if status == errSecSuccess || status == errSecItemNotFound {
      resolver(true)
    } else {
      rejecter("CLEAR_ERROR", "Failed to clear passwords (status: \(status))", nil)
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
