import Foundation
import React
import AVFoundation
import Vision
import CoreML
import UIKit

@objc(EmotionModule)
class EmotionModule: RCTEventEmitter, AVCaptureVideoDataOutputSampleBufferDelegate {

    // MARK: - Properties
    private var session: AVCaptureSession?
    private let emotionQueue = DispatchQueue(label: "com.styliq.emotionQueue")
    private let mlCore = MLCore()
    private var isSessionRunning = false
    private var lastEmit = Date(timeIntervalSince1970: 0)
    private var recent: [String] = []

    // MARK: - React Native bridge setup
    override static func requiresMainQueueSetup() -> Bool { true }
    override func supportedEvents() -> [String]! { ["onEmotionUpdate"] }

    // MARK: - Start camera session
    @objc func startEmotionTracking() {
        DispatchQueue.main.async {
            guard !self.isSessionRunning else { return }

            let session = AVCaptureSession()
            session.sessionPreset = .medium

            guard let device = AVCaptureDevice.default(.builtInWideAngleCamera,
                                                       for: .video,
                                                       position: .front),
                  let input = try? AVCaptureDeviceInput(device: device)
            else {
                print("❌ No front camera or failed to create input")
                return
            }

            if session.canAddInput(input) { session.addInput(input) }

            let output = AVCaptureVideoDataOutput()
            output.videoSettings = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
            ]
            output.alwaysDiscardsLateVideoFrames = true
            output.setSampleBufferDelegate(self, queue: self.emotionQueue)

            if session.canAddOutput(output) { session.addOutput(output) }

            // Mirror + orient correctly
            if let conn = output.connection(with: .video) {
                if conn.isVideoOrientationSupported { conn.videoOrientation = .portrait }
                if conn.isVideoMirroringSupported { conn.isVideoMirrored = true }
            }

            self.session = session
            session.startRunning()
            self.isSessionRunning = true
            print("🎥 Emotion tracking started")
        }
    }

    // MARK: - Stop camera session
    @objc func stopEmotionTracking() {
        DispatchQueue.main.async {
            guard self.isSessionRunning else { return }
            self.session?.stopRunning()
            self.session = nil
            self.isSessionRunning = false
            print("🛑 Emotion tracking stopped")
        }
    }

    // MARK: - Frame processing
    func captureOutput(_ output: AVCaptureOutput,
                       didOutput sampleBuffer: CMSampleBuffer,
                       from connection: AVCaptureConnection) {

        // Throttle to 2 detections per second
        guard Date().timeIntervalSince(lastEmit) > 0.5 else { return }
        lastEmit = Date()

        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext(options: nil)
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }

        do {
            let results = try mlCore.analyze(cgImage: cgImage)
            guard let first = results.first else { return }

            var emotion = first.dominantEmotion.rawValue
            var confidence = first.emotion[first.dominantEmotion] ?? 0

            // --- Smoothing + bias correction ---
            if confidence < 60 {
                emotion = "neutral"
                confidence = 60
            }

            recent.append(emotion)
            if recent.count > 6 { recent.removeFirst() }
            let counts = recent.reduce(into: [:]) { $0[$1, default: 0] += 1 }
            emotion = counts.max { $0.value < $1.value }?.key ?? emotion

            // --- Build payload with all emotion weights ---
            var payload: [String: Any] = [
                "emotion": emotion,
                "confidence": confidence
            ]

            // Add per-emotion probabilities
            for (key, value) in first.emotion {
                payload[key.rawValue] = value
            }

            // Normalize missing labels to 0.0 for stability on JS side
            let expected = ["happy", "sad", "angry", "fear", "surprise", "neutral", "disappointed"]
            for label in expected where payload[label] == nil {
                payload[label] = 0.0
            }

            // --- Emit event to React Native ---
            sendEvent(withName: "onEmotionUpdate", body: payload)
            print("✅ Emotion detected: \(emotion) (\(confidence)) → \(payload)")

        } catch {
            sendEvent(withName: "onEmotionUpdate", body: [
                "emotion": "error",
                "confidence": 0
            ])
            print("⚠️ MLCore error: \(error.localizedDescription)")
        }
    }
}

