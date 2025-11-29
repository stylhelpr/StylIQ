//
//  ARBodyTrackingViewController.swift
//  StylIQ
//
//  Final compiling + stable version
//  3D avatar overlay using ARKit body tracking.
//

import Foundation
import RealityKit
import ARKit
import UIKit

@objc public class ARBodyTrackingViewController: UIViewController, ARSessionDelegate {

    private static let sharedSession = ARSession()

    public var arView: ARView!
    public var overlayView: UIView!

    private var configuration: ARBodyTrackingConfiguration?
    private var isSessionRunning = false
    private var pendingStart = false
    private var hasAppeared = false

    private var avatarEntity: ModelEntity?
    private var avatarAnchor: AnchorEntity?

    @objc public var onSkeletonUpdate: (([String: Any]) -> Void)?

    // ---------------------------------------------------
    // LOAD VIEW
    // ---------------------------------------------------
    public override func loadView() {
        let root = UIView(frame: .zero)
        root.backgroundColor = .clear

        let ar = ARView(frame: .zero)
        ar.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        ar.session = ARBodyTrackingViewController.sharedSession
        ar.session.delegate = self
        self.arView = ar
        root.addSubview(ar)

        overlayView = UIView(frame: .zero)
        overlayView.backgroundColor = .clear
        overlayView.isUserInteractionEnabled = false
        root.addSubview(overlayView)

        self.view = root
    }

    public override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        arView.frame = view.bounds
        overlayView.frame = view.bounds
    }

    public override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        hasAppeared = true
        if pendingStart {
            pendingStart = false
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                self.reallyStartSession()
            }
        }
    }

    public override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopSession()
    }

    // ---------------------------------------------------
    // START / STOP
    // ---------------------------------------------------
    @objc public func startSession() {
        guard hasAppeared else {
            pendingStart = true
            print("⏳ startSession() queued (waiting for viewDidAppear)")
            return
        }

        if isSessionRunning {
            print("⚠️ ARSession already running — ignoring duplicate start")
            return
        }
        reallyStartSession()
    }

    private func reallyStartSession() {
        guard ARBodyTrackingConfiguration.isSupported else {
            print("❌ ARBodyTracking unsupported on this device")
            return
        }

        if isSessionRunning { stopSession() }

        let config = ARBodyTrackingConfiguration()
        config.isAutoFocusEnabled = true
        config.isLightEstimationEnabled = true
        config.frameSemantics = .bodyDetection
        configuration = config

        print("🔵 ARSession RUN (ARBodyTrackingConfiguration)…")

        arView.session.pause()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            self.arView.session.run(config,
                                    options: [.resetTracking, .removeExistingAnchors])
            self.isSessionRunning = true
        }
    }

    @objc public func stopSession() {
        guard isSessionRunning else { return }
        print("🔴 ARSession PAUSE")
        arView.session.pause()
        configuration = nil
        isSessionRunning = false
    }

    // ---------------------------------------------------
    // BODY UPDATES
    // ---------------------------------------------------
    public func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        for anchor in anchors {
            guard let bodyAnchor = anchor as? ARBodyAnchor else { continue }

            updateAvatarTransform(with: bodyAnchor.transform)

            let skeleton = bodyAnchor.skeleton
            let transforms = skeleton.jointModelTransforms
            let names = skeleton.definition.jointNames

            var joints: [String: [Float]] = [:]
            for (i, name) in names.enumerated() {
                let local = transforms[i]
                let world = simd_mul(bodyAnchor.transform, local)
                let pos = world.columns.3
                joints[name] = [pos.x, pos.y, pos.z]
            }

            onSkeletonUpdate?(["joints": joints,
                               "timestamp": Date().timeIntervalSince1970])
        }
    }

    private func updateAvatarTransform(with transform: simd_float4x4) {
        if avatarEntity == nil {
            loadAvatarModel(at: transform)
        } else {
            avatarEntity?.transform.matrix = transform
        }
    }

    private func loadAvatarModel(at transform: simd_float4x4) {
        do {
            // Load translucent 3D body model from bundle (character.usdz)
            let loaded = try Entity.load(named: "character")

            guard let modelEntity = loaded as? ModelEntity else {
                print("⚠️ Loaded entity is not a ModelEntity")
                return
            }

            let teal = UIColor.systemTeal.withAlphaComponent(0.35)
            let material = SimpleMaterial(color: teal, isMetallic: false)
            modelEntity.model?.materials = [material]
            modelEntity.scale = [1.0, 1.0, 1.0]

            let anchor = AnchorEntity(world: transform)
            anchor.addChild(modelEntity)
            arView.scene.addAnchor(anchor)

            avatarEntity = modelEntity
            avatarAnchor = anchor
        } catch {
            print("⚠️ Failed to load avatar model: \(error)")
        }
    }

    @objc public func startTracking() { startSession() }
    @objc public func stopTracking() { stopSession() }

    deinit { stopSession() }
}
