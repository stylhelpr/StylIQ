import Foundation
import AVFoundation
import React

@objc(AudioSessionManager)
class AudioSessionManager: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc func configure(_ resolve: RCTPromiseResolveBlock,
                       rejecter reject: RCTPromiseRejectBlock) {
    do {
      let session = AVAudioSession.sharedInstance()

      // 1️⃣  Force built-in mic route
      if let input = session.availableInputs?.first(where: { $0.portType == .builtInMic }) {
        try session.setPreferredInput(input)
      }

      // 2️⃣  Unified category for playback + mic
      try session.setCategory(.playAndRecord,
                              mode: .voiceChat,
                              options: [.mixWithOthers, .defaultToSpeaker])

      // 3️⃣  Hardware-safe format
      try session.setPreferredInputNumberOfChannels(1)
      try session.setPreferredSampleRate(48000)
      try session.setPreferredIOBufferDuration(0.01)

      // 4️⃣  Activate
      try session.setActive(true, options: .notifyOthersOnDeactivation)

      print("✅ iOS audio session ready:",
            "rate=\(session.sampleRate)",
            "in=\(session.inputNumberOfChannels)",
            "route=\(String(describing: session.currentRoute.inputs.first?.portType.rawValue))")

      resolve("ok")
    } catch {
      reject("audio_session_error", "Failed to configure AVAudioSession", error)
    }
  }
}
