// ios/MeasurementModule/MeasurementMath.swift
import Foundation
import CoreGraphics
import Vision

class MeasurementMath {

  static func distance(_ a: CGPoint, _ b: CGPoint) -> CGFloat {
    return hypot(a.x - b.x, a.y - b.y)
  }

  /// All high-level measurements we return to JS.
  ///
  /// - heights are "virtual" because we assume the full pose spans ~1.0 in normalized space
  ///   and then scale using userHeightCm.
  static func computeMeasurements(frontPose: PoseJoints,
                                  sidePose: PoseJoints,
                                  userHeightCm: Double) -> [String: Any] {

    // --- FRONT: widths (shoulders, hips, etc.) ---
    guard
      let lShoulder = frontPose.joints[.leftShoulder],
      let rShoulder = frontPose.joints[.rightShoulder],
      let lHip      = frontPose.joints[.leftHip],
      let rHip      = frontPose.joints[.rightHip]
    else {
      return [
        "error": "Missing key joints in front pose"
      ]
    }

    let shoulderWidthPx = distance(lShoulder, rShoulder)
    let hipWidthPx      = distance(lHip, rHip)

    // --- SIDE: vertical distances (leg length, torso, etc.) ---
    let maybeSideKnee   = sidePose.joints[.leftKnee] ?? sidePose.joints[.rightKnee]
    let maybeSideAnkle  = sidePose.joints[.leftAnkle] ?? sidePose.joints[.rightAnkle]
    let maybeSideHip    = sidePose.joints[.leftHip] ?? sidePose.joints[.rightHip]
    let maybeSideNeck   = sidePose.joints[.neck]

    var legLengthPx: CGFloat?
    var inseamPx: CGFloat?
    var torsoLengthPx: CGFloat?

    if let hip = maybeSideHip, let ankle = maybeSideAnkle {
      legLengthPx = abs(hip.y - ankle.y)
      // Inseam is slightly shorter than full hip-to-ankle length; simple scale for now.
      inseamPx = legLengthPx! * 0.96
    }

    if let neck = maybeSideNeck, let hip = maybeSideHip {
      torsoLengthPx = abs(neck.y - hip.y)
    }

    // --- Calibration: map normalized "height" to userHeightCm ---
    //
    // Vision’s pose coordinates are normalized [0,1].
    // In practice, the person’s head-to-toe span is close to 1.0,
    // so we use userHeightCm as our scale factor.
    let pxToCm = userHeightCm / 1.0

    let shoulderWidthCm = Double(shoulderWidthPx) * pxToCm
    let hipWidthCm      = Double(hipWidthPx) * pxToCm

    let legLengthCm     = legLengthPx != nil ? Double(legLengthPx!) * pxToCm : 0.0
    let inseamCm        = inseamPx    != nil ? Double(inseamPx!)    * pxToCm : 0.0
    let torsoLengthCm   = torsoLengthPx != nil ? Double(torsoLengthPx!) * pxToCm : 0.0

    // --- Convert widths → circumferences (ellipse approximation) ---
    //
    // These factors (0.85, 0.90, 0.90) are reasonable CV-paper style constants
    // for consumer-grade body measurements.
    let shoulderCircumference = shoulderWidthCm * Double.pi * 0.85
    let hipCircumference      = hipWidthCm      * Double.pi * 0.90
    let waistCircumference    = hipCircumference * 0.90  // simple proportional estimate

    // Ratios / derived features
    let shoulderToHipRatio = shoulderWidthCm > 0
      ? shoulderWidthCm / hipWidthCm
      : 0.0

    return [
      // raw widths
      "shoulderWidthCm": shoulderWidthCm,
      "hipWidthCm": hipWidthCm,

      // circumferences
      "chestCircumferenceCm": shoulderCircumference,
      "waistCircumferenceCm": waistCircumference,
      "hipCircumferenceCm": hipCircumference,

      // verticals
      "legLengthCm": legLengthCm,
      "inseamCm": inseamCm,
      "torsoLengthCm": torsoLengthCm,

      // ratios
      "shoulderToHipRatio": shoulderToHipRatio
    ]
  }
}
