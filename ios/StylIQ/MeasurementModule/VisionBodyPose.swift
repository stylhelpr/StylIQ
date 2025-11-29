// ios/MeasurementModule/VisionBodyPose.swift
import Foundation
import UIKit
import Vision
import CoreImage

struct PoseJoints {
    let joints: [VNHumanBodyPoseObservation.JointName: CGPoint]
}

class VisionBodyPose {

    // MARK: - PUBLIC API
    static func extract(from image: UIImage,
                        completion: @escaping (PoseJoints?) -> Void) {

        guard let fixedImage = image.fixedOrientation()?.cgImage else {
            completion(nil)
            return
        }

 let request = VNDetectHumanBodyPoseRequest()
request.revision = VNDetectHumanBodyPoseRequest.defaultRevision
        let handler = VNImageRequestHandler(
            cgImage: fixedImage,
            options: [:]
        )

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try handler.perform([request])
                guard let observation = request.results?.first as? VNHumanBodyPoseObservation else {
                    completion(nil)
                    return
                }

                let recognizedPoints = try observation.recognizedPoints(.all)
                var joints: [VNHumanBodyPoseObservation.JointName: CGPoint] = [:]

                for (jointName, point) in recognizedPoints {
                    if point.confidence > 0.15 {
                        let normalized = CGPoint(
                            x: CGFloat(point.location.x),
                            y: CGFloat(1.0 - point.location.y)
                        )
                        joints[jointName] = normalized
                    }
                }

                if joints.isEmpty {
                    completion(nil)
                } else {
                    completion(PoseJoints(joints: joints))
                }

            } catch {
                completion(nil)
            }
        }
    }
}

extension UIImage {

    // FIXED: Vision requires a **true upright CGImage**, not EXIF-based.
    func fixedOrientation() -> UIImage? {
        if imageOrientation == .up {
            return self
        }

        guard let cgImg = self.cgImage else { return nil }

        let renderer = UIGraphicsImageRenderer(size: size)
        let newImage = renderer.image { _ in
            draw(in: CGRect(origin: .zero, size: size))
        }
        return newImage
    }
}
