import Foundation
import React
import ARKit
import UIKit

@objc(HeadPoseModule)
class HeadPoseModule: RCTEventEmitter, ARSessionDelegate {

    private var session: ARSession?
    private var isTracking = false
    private var neutralYaw: Float = 0.0
    private var lastDirection: String? = nil
    private var lastEmit = Date(timeIntervalSince1970: 0)

    // Sensitivity controls
    private let yawThreshold: Float = 0.15     // smaller = more sensitive (default 0.25)
    private let cooldown: TimeInterval = 0.8   // seconds before another detection

    override static func requiresMainQueueSetup() -> Bool { true }
    override func supportedEvents() -> [String]! { ["onHeadTurnLeft", "onHeadTurnRight"] }

    // MARK: Start
    @objc func startHeadTracking() {
        // DispatchQueue.main.async {
        //     guard ARFaceTrackingConfiguration.isSupported else {
        //         print("❌ ARFaceTracking not supported on this device")
        //         return
        //     }
        //     guard !self.isTracking else { return }

        //     let config = ARFaceTrackingConfiguration()
        //     config.isLightEstimationEnabled = false

        //     let session = ARSession()
        //     session.delegate = self
        //     session.run(config, options: [.resetTracking, .removeExistingAnchors])

        //     self.session = session
        //     self.isTracking = true
        //     self.neutralYaw = 0.0
        //     self.lastDirection = nil
        //     print("🟢 Head tracking started (threshold: \(self.yawThreshold))")
        // }
    }

    // MARK: Stop
    @objc func stopHeadTracking() {
        DispatchQueue.main.async {
            guard self.isTracking else { return }
            self.session?.pause()
            self.session = nil
            self.isTracking = false
            print("🛑 Head tracking stopped")
        }
    }

    // MARK: Delegate
    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        guard let faceAnchor = anchors.first as? ARFaceAnchor else { return }

        let yaw = faceAnchor.transform.eulerAngles.y
        let delta = yaw - neutralYaw
        let now = Date()

        // Don’t spam — only every cooldown interval
        guard now.timeIntervalSince(lastEmit) > cooldown else { return }

        // Detect LEFT
        if delta < -yawThreshold, lastDirection != "left" {
            sendEvent(withName: "onHeadTurnLeft", body: ["yaw": yaw])
            lastEmit = now
            lastDirection = "left"
            print("⬅️ Head turn LEFT (\(yaw))")
        }

        // Detect RIGHT
        else if delta > yawThreshold, lastDirection != "right" {
            sendEvent(withName: "onHeadTurnRight", body: ["yaw": yaw])
            lastEmit = now
            lastDirection = "right"
            print("➡️ Head turn RIGHT (\(yaw))")
        }

        // Reset when head returns to neutral range
        else if abs(delta) < yawThreshold * 0.5 {
            lastDirection = nil
        }
    }
}

// MARK: Euler angle helper
private extension simd_float4x4 {
    var eulerAngles: SIMD3<Float> {
        let sy = sqrt(columns.0.x * columns.0.x + columns.1.x * columns.1.x)
        let x = atan2(columns.2.y, columns.2.z)
        let y = atan2(-columns.2.x, sy)
        let z = atan2(columns.1.x, columns.0.x)
        return SIMD3<Float>(x, y, z)
    }
}
