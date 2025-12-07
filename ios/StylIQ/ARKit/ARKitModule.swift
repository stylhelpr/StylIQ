//
//  ARKitModule.swift
//  StylIQ
//

import Foundation
import React
import UIKit
import RealityKit   // ✅ Required for AnchorEntity, ModelEntity, SimpleMaterial

@objc(ARKitModule)
class ARKitModule: RCTEventEmitter {

    static var shared: ARKitModule?

    private var controller: ARBodyTrackingViewController? {
        return ARKitViewManager.currentController
    }

    override init() {
        super.init()
        ARKitModule.shared = self
    }

    @objc override static func requiresMainQueueSetup() -> Bool { true }

    override func supportedEvents() -> [String]! {
        return ["onSkeletonUpdate", "ARKitViewReady"]
    }

    // ---------------------------------------------------
    // START TRACKING
    // ---------------------------------------------------
    @objc func startTracking() {
        DispatchQueue.main.async {
            guard let c = self.controller else {
                print("❌ ARKitModule: controller missing")
                return
            }

            print("🔵 ARKitModule → START")
            c.startSession()

            c.onSkeletonUpdate = { [weak self] payload in
                self?.sendEvent(withName: "onSkeletonUpdate", body: payload)
            }
        }
    }

    // ---------------------------------------------------
    // STOP TRACKING
    // ---------------------------------------------------
    @objc func stopTracking() {
        DispatchQueue.main.async {
            guard let c = self.controller else { return }
            print("🔴 ARKitModule → STOP")
            c.stopSession()
        }
    }

    @objc func sendViewReady() {
        print("📣 ARKitModule → ARKitViewReady")
        sendEvent(withName: "ARKitViewReady", body: nil)
    }

    // ---------------------------------------------------
    // RENDER MESH POINTS FROM JS
    // ---------------------------------------------------
    @objc(renderMesh:)
    func renderMesh(_ vertices: [NSNumber]) {
        DispatchQueue.main.async {
            guard let c = self.controller else {
                print("❌ ARKitModule: controller missing for mesh render")
                return
            }

            guard let arView = c.arView else {
                print("❌ ARKitModule: ARView missing")
                return
            }

            print("🟢 Rendering mesh with \(vertices.count / 3) vertices")

            // ✅ Remove old anchors
            for anchor in arView.scene.anchors where anchor.name == "StylIQMesh" {
                arView.scene.removeAnchor(anchor)
            }

            // ✅ Compute centroid
            let count = vertices.count / 3
            guard count > 0 else { return }

            var cx: Float = 0
            var cy: Float = 0
            var cz: Float = 0

            for i in stride(from: 0, to: vertices.count, by: 3) {
                cx += Float(truncating: vertices[i])
                cy += Float(truncating: vertices[i + 1])
                cz += Float(truncating: vertices[i + 2])
            }

            cx /= Float(count)
            cy /= Float(count)
            cz /= Float(count)

            // ✅ Anchor near camera (move closer)
            // ✅ Anchor far in front of camera (bring close to user)
                let cameraOffset: Float = -1.7 // go several meters forward toward the camera
                let anchorPosition = SIMD3<Float>(-cx, -cy - 0.2, -cz + cameraOffset)
                let anchor = AnchorEntity(world: anchorPosition)
                anchor.name = "StylIQMesh"

            // ✅ Add teal spheres
            for i in stride(from: 0, to: vertices.count, by: 3) {
                guard i + 2 < vertices.count else { continue }
                let x = Float(truncating: vertices[i])
                let y = Float(truncating: vertices[i + 1])
                let z = Float(truncating: vertices[i + 2])

                let sphere = ModelEntity(
                    mesh: .generateSphere(radius: 0.02),
                    materials: [SimpleMaterial(color: .systemTeal, isMetallic: false)]
                )

                sphere.position = SIMD3<Float>(x, y, z)
                anchor.addChild(sphere)
            }

            arView.scene.addAnchor(anchor)
            print("✅ StylIQMesh anchor added, centered, and offset closer to camera")
        }
    }
}

