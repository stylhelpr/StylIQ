//
//  StylIQDynamicIslandModule.swift
//  StylIQ
//

import Foundation
import ActivityKit
import React

// -------------------------------------------------------------
// Swift cannot see React typedefs unless defined here
// -------------------------------------------------------------
typealias RCTPromiseResolveBlock = (Any?) -> Void
typealias RCTPromiseRejectBlock = (String?, String?, Error?) -> Void
typealias RCTResponseSenderBlock = ([Any]?) -> Void

@objc(StylIQDynamicIslandModule)
class StylIQDynamicIslandModule: NSObject {

  private var currentActivity: Activity<StylIQActivityAttributes>? = nil

  // -------------------------------------------------------------
  // CAN START? (callback-style)
  // -------------------------------------------------------------
  @objc(canStart:)
  func canStart(_ callback: @escaping RCTResponseSenderBlock) {
    if #available(iOS 16.1, *) {
      let enabled = ActivityAuthorizationInfo().areActivitiesEnabled
      callback([NSNull(), enabled])
    } else {
      callback([NSNull(), false])
    }
  }

  // -------------------------------------------------------------
  // ARE ACTIVITIES ENABLED (promise-style)
  // -------------------------------------------------------------
  @objc
  func areActivitiesEnabled(_ resolve: RCTPromiseResolveBlock,
                            rejecter reject: RCTPromiseRejectBlock) {
    if #available(iOS 16.1, *) {
      resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
    } else {
      resolve(false)
    }
  }

  // -------------------------------------------------------------
  // FORCE END ALL EXISTING LIVE ACTIVITIES
  // -------------------------------------------------------------
  @objc(endAllActivities:withRejecter:)
  func endAllActivities(_ resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 16.1, *) else {
      resolve("Live Activities not supported")
      return
    }

    let activities = Activity<StylIQActivityAttributes>.activities

    if activities.isEmpty {
      resolve("No existing activities")
      return
    }

    Task {
      for activity in activities {
        await activity.end(
          using: StylIQActivityAttributes.ContentState(message: "Ended"),
          dismissalPolicy: .immediate
        )
      }
      self.currentActivity = nil
      resolve("Ended ALL Live Activities")
    }
  }

  // -------------------------------------------------------------
  // SAFE START ACTIVITY (auto-clears stale activities)
  // -------------------------------------------------------------
  @objc(startActivity:withMessage:withResolver:withRejecter:)
  func startActivity(_ title: String,
                     message: String,
                     resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 16.1, *) else {
      resolve("Live Activities not supported")
      return
    }

    Task {

      // 1. End stale leftover activities
      for activity in Activity<StylIQActivityAttributes>.activities {
        await activity.end(
          using: StylIQActivityAttributes.ContentState(message: "Ended"),
          dismissalPolicy: .immediate
        )
      }

      // 2. Create new attributes + state
      let attrs = StylIQActivityAttributes(title: title)
      let state = StylIQActivityAttributes.ContentState(message: message)

      do {
        let newActivity = try Activity.request(
          attributes: attrs,
          contentState: state
        )
        self.currentActivity = newActivity
        resolve("Started Live Activity (fresh)")
        print("📡 Active activities:", Activity<StylIQActivityAttributes>.activities)

      } catch {
        let nsError = error as NSError
        let details = "Domain: \(nsError.domain) Code: \(nsError.code) UserInfo: \(nsError.userInfo)"
        reject("start_error", details, error)
      }
    }
  }

  // -------------------------------------------------------------
  // UPDATE ACTIVITY
  // -------------------------------------------------------------
  @objc(updateActivity:withResolver:withRejecter:)
  func updateActivity(_ message: String,
                      resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 16.1, *) else {
      resolve("Live Activities not supported")
      return
    }

    guard let activity = currentActivity else {
      resolve("No active Live Activity")
      return
    }

    let newState = StylIQActivityAttributes.ContentState(message: message)

    Task {
      await activity.update(using: newState)
      resolve("Updated Live Activity")
    }
  }

  // -------------------------------------------------------------
  // END CURRENT ACTIVITY
  // -------------------------------------------------------------
  @objc(endActivity:withRejecter:)
  func endActivity(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 16.1, *) else {
      resolve("Live Activities not supported")
      return
    }

    guard let activity = currentActivity else {
      resolve("No active Live Activity")
      return
    }

    let finalState = StylIQActivityAttributes.ContentState(message: "Ended")

    Task {
      await activity.end(using: finalState, dismissalPolicy: .default)
      self.currentActivity = nil
      resolve("Ended Live Activity")
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
