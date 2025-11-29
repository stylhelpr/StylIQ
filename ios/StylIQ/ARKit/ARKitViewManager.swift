//
//  ARKitViewManager.swift
//  StylIQ
//

import Foundation
import React
import UIKit

@objc(ARKitViewManager)
class ARKitViewManager: RCTViewManager {

    // Persistent controller
    static let persistentController = ARBodyTrackingViewController()

    // Persistent container (THE FIX)
    static let persistentContainer = ARKitContainerView(
        controller: ARKitViewManager.persistentController
    )

    static var currentController: ARBodyTrackingViewController? = persistentController

    override static func requiresMainQueueSetup() -> Bool { true }

    override func view() -> UIView! {
        print("🟢 ARKitViewManager.view() CALLED")

        ARKitViewManager.currentController = ARKitViewManager.persistentController

        DispatchQueue.main.async {
            ARKitModule.shared?.sendViewReady()
            print("📣 ARKitViewManager → ARKitViewReady emitted")
        }

        // NEVER recreate — always return persistent view
        return ARKitViewManager.persistentContainer
    }
}
