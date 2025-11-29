// ios/MeasurementModule/MeasurementModule.swift
import Foundation
import UIKit
import Vision
import React

@objc(MeasurementModule)
class MeasurementModule: NSObject {

  /// React Native will call this as a Promise:
  /// MeasurementModule.measureBody({ frontPhotoPath, sidePhotoPath, userHeightCm })
  @objc(measureBody:resolver:rejecter:)
  func measureBody(_ params: NSDictionary,
                   resolver: @escaping RCTPromiseResolveBlock,
                   rejecter: @escaping RCTPromiseRejectBlock) {

    guard
      let frontPath = params["frontPhotoPath"] as? String,
      let sidePath  = params["sidePhotoPath"] as? String,
      let heightCm  = params["userHeightCm"] as? Double
    else {
      rejecter("ERR_INVALID_PARAMS", "Invalid params: expected frontPhotoPath, sidePhotoPath, userHeightCm", nil)
      return
    }

    guard
      let frontImage = UIImage(contentsOfFile: frontPath),
      let sideImage  = UIImage(contentsOfFile: sidePath)
    else {
      rejecter("ERR_LOAD_IMAGES", "Could not load images from given paths", nil)
      return
    }

    // Run Vision on a background queue
    DispatchQueue.global(qos: .userInitiated).async {
      let group = DispatchGroup()

      var frontPoseResult: PoseJoints?
      var sidePoseResult: PoseJoints?

      group.enter()
      VisionBodyPose.extract(from: frontImage) { pose in
        frontPoseResult = pose
        group.leave()
      }

      group.enter()
      VisionBodyPose.extract(from: sideImage) { pose in
        sidePoseResult = pose
        group.leave()
      }

      group.notify(queue: .global(qos: .userInitiated)) {
        guard
          let frontPose = frontPoseResult,
          let sidePose  = sidePoseResult
        else {
          DispatchQueue.main.async {
            rejecter("ERR_POSE_DETECTION", "Pose detection failed on one or both images", nil)
          }
          return
        }

        let results = MeasurementMath.computeMeasurements(
          frontPose: frontPose,
          sidePose:  sidePose,
          userHeightCm: heightCm
        )

        DispatchQueue.main.async {
          resolver(results)
        }
      }
    }
  }

  // Optional: RN 0.82 still supports this for legacy modules
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
