import Foundation
import Photos
import UIKit

@objc(ImageSaverModule)
class ImageSaverModule: NSObject {

  @objc
  func saveImageFromUrl(_ urlString: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let url = URL(string: urlString) else {
      rejecter("INVALID_URL", "Invalid URL provided", nil)
      return
    }

    let task = URLSession.shared.dataTask(with: url) { data, response, error in
      if let error = error {
        rejecter("DOWNLOAD_ERROR", error.localizedDescription, error)
        return
      }

      guard let data = data, let image = UIImage(data: data) else {
        rejecter("INVALID_IMAGE", "Could not create image from downloaded data", nil)
        return
      }

      PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
        guard status == .authorized || status == .limited else {
          rejecter("PERMISSION_DENIED", "Photo library access denied", nil)
          return
        }

        PHPhotoLibrary.shared().performChanges({
          PHAssetChangeRequest.creationRequestForAsset(from: image)
        }) { success, error in
          if success {
            resolver(true)
          } else {
            rejecter("SAVE_ERROR", error?.localizedDescription ?? "Failed to save image", error)
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
