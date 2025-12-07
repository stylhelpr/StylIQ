import Foundation
import Vision
import UIKit

@objc(VisionAlignment)
class VisionAlignment: NSObject {

  @objc(detectAlignment:resolver:rejecter:)
  func detectAlignment(imagePath: String,
                       resolver: @escaping RCTPromiseResolveBlock,
                       rejecter: @escaping RCTPromiseRejectBlock) {

    guard let uiImage = UIImage(contentsOfFile: imagePath) else {
      rejecter("image_error", "Could not load image", nil)
      return
    }

    guard let cgImage = uiImage.cgImage else {
      rejecter("cg_error", "Could not convert to CGImage", nil)
      return
    }

    let request = VNDetectHumanBodyPoseRequest { req, err in
      if let err = err {
        rejecter("vision_error", "Pose detection failed", err)
        return
      }

      guard let results = req.results as? [VNHumanBodyPoseObservation],
            let obs = results.first else {
        resolver(["aligned": false])
        return
      }

      guard let points = try? obs.recognizedPoints(.all) else {
        resolver(["aligned": false])
        return
      }

      guard let leftShoulder = points[.leftShoulder],
            let rightShoulder = points[.rightShoulder],
            leftShoulder.confidence > 0.4,
            rightShoulder.confidence > 0.4 else {
        resolver(["aligned": false])
        return
      }

      let dx = abs(leftShoulder.location.x - rightShoulder.location.x)
      resolver(["aligned": dx < 0.05])
    }

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try handler.perform([request])
      } catch {
        rejecter("handler_error", "Vision request failed", error)
      }
    }
  }
}
what