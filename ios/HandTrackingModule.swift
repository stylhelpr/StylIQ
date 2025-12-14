import Foundation
import React
import ARKit
import UIKit

@objc(HandTrackingModule)
class HandTrackingModule: RCTEventEmitter, ARSessionDelegate {

    private var session: ARSession?
    private var isTracking = false
    private var lastGesture: String? = nil
    private var lastEmit = Date(timeIntervalSince1970: 0)
    private let cooldown: TimeInterval = 0.6   // seconds between emits

    override static func requiresMainQueueSetup() -> Bool { true }
    override func supportedEvents() -> [String]! { ["onHandGesture"] }

    // MARK: Start
    @objc func startHandTracking() {
        DispatchQueue.main.async {
            // ✅ Only run if ARKit 6 (iOS 18) is available
            guard #available(iOS 18.0, *),
                  let configType = NSClassFromString("ARHandTrackingConfiguration") as? ARConfiguration.Type,
                  configType.isSupported else {
                return
            }
            guard !self.isTracking else { return }

            // Create config dynamically so compiler doesn't need the symbol
            guard let config = (configType as? NSObject.Type)?.init() as? ARConfiguration else {
                return
            }

            let session = ARSession()
            session.delegate = self
            session.run(config, options: [.resetTracking, .removeExistingAnchors])

            self.session = session
            self.isTracking = true
            self.lastGesture = nil
            self.lastEmit = Date(timeIntervalSince1970: 0)

            print("🟢 Hand tracking started (guarded)")
        }
    }

    // MARK: Stop
    @objc func stopHandTracking() {
        DispatchQueue.main.async {
            guard self.isTracking else { return }
            self.session?.pause()
            self.session = nil
            self.isTracking = false
            print("🛑 Hand tracking stopped")
        }
    }

    // MARK: Delegate
    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        // ✅ Only run if ARHandAnchor exists at runtime
        guard #available(iOS 18.0, *),
              NSClassFromString("ARHandAnchor") != nil else {
            // Running on older SDK — nothing to process
            return
        }

        // ✅ Cooldown gate to prevent bridge overload
        let now = Date()
        guard now.timeIntervalSince(lastEmit) > cooldown else { return }
        lastEmit = now

        // For now, just emit a heartbeat signal every 0.6s to JS
        sendEvent(withName: "onHandGesture", body: ["gesture": "heartbeat"])
        print("📡 AR session update — throttled emit")
    }
}
