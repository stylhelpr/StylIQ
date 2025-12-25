import Foundation
import Photos
import UIKit

/**
 * ImageSaverModule - Secure image download and save to Photos
 *
 * SECURITY CONTROLS:
 * - Only allows HTTP/HTTPS schemes
 * - Blocks internal/localhost/private IP ranges (SSRF prevention)
 * - Validates Content-Type is image/
 * - Enforces 50MB size limit
 * - Uses ephemeral session (no cookie/cache persistence)
 */
@objc(ImageSaverModule)
class ImageSaverModule: NSObject {

  // MARK: - Security Constants

  /// Maximum allowed image size: 50MB
  private static let MAX_IMAGE_SIZE = 50 * 1024 * 1024

  /// Allowed URL schemes
  private static let ALLOWED_SCHEMES = ["http", "https"]

  /// Blocked hostnames (case-insensitive)
  private static let BLOCKED_HOSTS = ["localhost", "127.0.0.1", "::1"]

  // MARK: - URL Validation

  /// Validates that a URL is safe for image downloading
  /// - Parameter url: The URL to validate
  /// - Returns: Tuple of (isValid, errorMessage)
  private func validateUrl(_ url: URL) -> (isValid: Bool, error: String?) {
    // Check scheme is HTTP or HTTPS
    guard let scheme = url.scheme?.lowercased(),
          ImageSaverModule.ALLOWED_SCHEMES.contains(scheme) else {
      return (false, "Only HTTP/HTTPS URLs are allowed")
    }

    // Check host exists
    guard let host = url.host?.lowercased() else {
      return (false, "URL must have a valid host")
    }

    // Block localhost
    if ImageSaverModule.BLOCKED_HOSTS.contains(host) {
      return (false, "Localhost URLs are not allowed")
    }

    // Block .local domains (mDNS/Bonjour)
    if host.hasSuffix(".local") {
      return (false, "Local network URLs are not allowed")
    }

    // Block private IP ranges
    // 10.0.0.0/8
    if host.hasPrefix("10.") {
      return (false, "Private IP range (10.x.x.x) not allowed")
    }

    // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    if host.hasPrefix("172.") {
      let parts = host.split(separator: ".")
      if parts.count >= 2, let second = Int(parts[1]) {
        if second >= 16 && second <= 31 {
          return (false, "Private IP range (172.16-31.x.x) not allowed")
        }
      }
    }

    // 192.168.0.0/16
    if host.hasPrefix("192.168.") {
      return (false, "Private IP range (192.168.x.x) not allowed")
    }

    // 169.254.0.0/16 (link-local, includes cloud metadata endpoints)
    if host.hasPrefix("169.254.") {
      return (false, "Link-local IP range (169.254.x.x) not allowed - potential metadata endpoint")
    }

    // Block common cloud metadata endpoints explicitly
    if host == "metadata.google.internal" ||
       host.hasSuffix(".compute.internal") ||
       host.hasSuffix(".ec2.internal") {
      return (false, "Cloud metadata endpoints are not allowed")
    }

    return (true, nil)
  }

  // MARK: - Main Method

  @objc
  func saveImageFromUrl(_ urlString: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {

    // Step 1: Parse URL
    guard let url = URL(string: urlString) else {
      rejecter("INVALID_URL", "Invalid URL provided", nil)
      return
    }

    // Step 2: Security validation
    let validation = validateUrl(url)
    guard validation.isValid else {
      print("[ImageSaver] SECURITY: Blocked URL - \(validation.error ?? "unknown"): \(urlString)")
      rejecter("BLOCKED_URL", validation.error ?? "URL blocked for security reasons", nil)
      return
    }

    // Step 3: Log allowed download (useful for security audits)
    print("[ImageSaver] Downloading image from: \(url.host ?? "unknown")")

    // Step 4: Use ephemeral session configuration (no cookies, no cache persistence)
    // This prevents session leakage and ensures no tracking cookies are sent
    let sessionConfig = URLSessionConfiguration.ephemeral
    sessionConfig.timeoutIntervalForRequest = 30
    sessionConfig.timeoutIntervalForResource = 60
    let session = URLSession(configuration: sessionConfig)

    // Step 5: Create and execute request
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    // Set a reasonable user agent
    request.setValue("StylIQ/1.0 ImageSaver", forHTTPHeaderField: "User-Agent")

    let task = session.dataTask(with: request) { [weak self] data, response, error in
      guard let self = self else { return }

      // Handle network errors
      if let error = error {
        rejecter("DOWNLOAD_ERROR", error.localizedDescription, error)
        return
      }

      // Validate HTTP response
      guard let httpResponse = response as? HTTPURLResponse else {
        rejecter("INVALID_RESPONSE", "Did not receive HTTP response", nil)
        return
      }

      // Check HTTP status code
      guard (200...299).contains(httpResponse.statusCode) else {
        rejecter("HTTP_ERROR", "HTTP error: \(httpResponse.statusCode)", nil)
        return
      }

      // Step 6: Validate Content-Type is an image
      let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type")?.lowercased() ?? ""
      guard contentType.hasPrefix("image/") else {
        print("[ImageSaver] SECURITY: Blocked non-image Content-Type: \(contentType)")
        rejecter("INVALID_CONTENT_TYPE", "Response is not an image (Content-Type: \(contentType))", nil)
        return
      }

      // Step 7: Check Content-Length if provided
      if let contentLengthStr = httpResponse.value(forHTTPHeaderField: "Content-Length"),
         let contentLength = Int(contentLengthStr) {
        if contentLength > ImageSaverModule.MAX_IMAGE_SIZE {
          rejecter("FILE_TOO_LARGE", "Image exceeds 50MB size limit", nil)
          return
        }
      }

      // Step 8: Validate data exists and check actual size
      guard let data = data else {
        rejecter("NO_DATA", "No data received from server", nil)
        return
      }

      if data.count > ImageSaverModule.MAX_IMAGE_SIZE {
        rejecter("FILE_TOO_LARGE", "Downloaded image exceeds 50MB size limit", nil)
        return
      }

      // Step 9: Try to create UIImage from data
      guard let image = UIImage(data: data) else {
        rejecter("INVALID_IMAGE", "Could not create image from downloaded data - may be corrupted or not a valid image format", nil)
        return
      }

      // Step 10: Save to Photos library
      PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
        guard status == .authorized || status == .limited else {
          rejecter("PERMISSION_DENIED", "Photo library access denied", nil)
          return
        }

        PHPhotoLibrary.shared().performChanges({
          PHAssetChangeRequest.creationRequestForAsset(from: image)
        }) { success, error in
          if success {
            print("[ImageSaver] Successfully saved image to Photos")
            resolver(true)
          } else {
            rejecter("SAVE_ERROR", error?.localizedDescription ?? "Failed to save image to Photos library", error)
          }
        }
      }
    }

    task.resume()
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
