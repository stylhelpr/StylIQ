import Foundation
import Vision
import CoreML
import UIKit

public class MLCore {
    private let faceImageTool = FaceImageTool()
    private var mlModel: VNCoreMLModel?

    public init() {}

    public func analyze(cgImage: CGImage) throws -> [EmotionAnalysis] {
        if mlModel == nil {
            self.mlModel = try makeMLModel()
        }

        let faces = try faceImageTool.extractFaces(from: cgImage)
        print("🧠 Faces detected:", faces.count)

        return try faces.compactMap { face -> EmotionAnalysis? in
            let boundingBox = face.boundingBox
            guard let faceImage = faceImageTool.cropFace(from: cgImage, boundingBox: boundingBox) else {
                return nil
            }

            guard let preprocessedFaceImage = faceImageTool.preprocessImage(image: faceImage) else {
                return nil
            }

            // ✅ Correct Vision request setup
            let request = VNCoreMLRequest(model: mlModel!) { request, error in
                if let error = error {
                    print("⚠️ VNCoreMLRequest error:", error)
                }
            }
            request.imageCropAndScaleOption = .centerCrop

            let handler = VNImageRequestHandler(cgImage: preprocessedFaceImage, options: [:])
            try handler.perform([request])

            guard let observations = request.results as? [VNCoreMLFeatureValueObservation],
                  let firstObservation = observations.first,
                  let multiArray = firstObservation.featureValue.multiArrayValue else {
                return nil
            }

            let emotionResult: [Emotion: Double] = Emotion.allCases.enumerated().reduce(into: [:]) { result, pair in
                let (index, emotionLabel) = pair
                result[emotionLabel] = Double(truncating: multiArray[index]) * 100.0
            }

            let dominantEmotion = emotionResult.dominantEmotion ?? .neutral
            print("✅ Dominant:", dominantEmotion.rawValue)
            return EmotionAnalysis(region: boundingBox, emotion: emotionResult, dominantEmotion: dominantEmotion)
        }
    }

    private func makeMLModel() throws -> VNCoreMLModel {
        let config = MLModelConfiguration()
        let model = try FacialExpressionModel(configuration: config)
        return try VNCoreMLModel(for: model.model)
    }
}
