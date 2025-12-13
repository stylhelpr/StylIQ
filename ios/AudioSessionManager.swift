import Foundation
import AVFoundation
import React

// -----------------------------------------------------------------------------
// AudioSessionManager — Native audio session control for React Native
// -----------------------------------------------------------------------------
// Provides two distinct modes:
//   - Playback Mode: For video/audio playback without microphone
//   - Voice Mode: For speech recognition and TTS with microphone access
//
// These modes are mutually exclusive per iOS AVAudioSession constraints.
// The JS AudioMode manager coordinates which mode is active.
// -----------------------------------------------------------------------------

@objc(AudioSessionManager)
class AudioSessionManager: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { true }

  // MARK: - Playback Mode (Video)

  /// Configure audio session for video/audio playback.
  /// Uses .playback category — no microphone access, optimized for media.
  @objc func setPlaybackMode(_ resolve: @escaping RCTPromiseResolveBlock,
                              rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      do {
        let session = AVAudioSession.sharedInstance()

        // Deactivate first to cleanly switch categories
        try? session.setActive(false, options: .notifyOthersOnDeactivation)

        // Playback category — no mic, speaker output only
        try session.setCategory(.playback,
                                mode: .moviePlayback,
                                options: [.mixWithOthers])

        try session.setActive(true, options: .notifyOthersOnDeactivation)

        print("🎬 [AudioSession] Playback mode active")
        resolve("playback")
      } catch {
        print("❌ [AudioSession] Failed to set playback mode: \(error)")
        reject("audio_session_error", "Failed to set playback mode", error)
      }
    }
  }

  // MARK: - Voice Mode (Mic + Speaker)

  /// Configure audio session for voice recognition and TTS.
  /// Uses .playAndRecord category with voice chat optimizations.
  @objc func setVoiceMode(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Run on MAIN queue - AVAudioSession operations are safer on main thread
    DispatchQueue.main.async {
      do {
        let session = AVAudioSession.sharedInstance()

        // First, just set the category without deactivating
        // Deactivating can cause issues when switching from playback
        // iOS handles the transition internally

        // Use .playAndRecord with minimal options to avoid -50 errors
        // .defaultToSpeaker routes audio to speaker instead of earpiece
        // .allowBluetoothA2DP is the modern replacement for deprecated .allowBluetooth
        try session.setCategory(.playAndRecord,
                                mode: .spokenAudio,  // Better for speech recognition than .voiceChat
                                options: [.defaultToSpeaker, .allowBluetoothA2DP])

        // Set preferred sample rate BEFORE activation
        // 16000 Hz is optimal for speech recognition
        try session.setPreferredSampleRate(16000)
        try session.setPreferredIOBufferDuration(0.01) // 10ms buffer

        // Activate the session
        try session.setActive(true)

        // Small delay for hardware to stabilize
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
          // Verify the session is properly configured
          let actualRate = session.sampleRate
          let inputChannels = session.inputNumberOfChannels

          print("🎤 [AudioSession] Voice mode active:",
                "rate=\(actualRate)",
                "channels=\(inputChannels)",
                "route=\(String(describing: session.currentRoute.inputs.first?.portType.rawValue))")

          // Verify sample rate is valid (not 0)
          if actualRate == 0 {
            print("⚠️ [AudioSession] Sample rate is 0! Audio hardware may not be ready")
          }

          resolve("voice")
        }
      } catch {
        print("❌ [AudioSession] Failed to set voice mode: \(error)")
        reject("audio_session_error", "Failed to set voice mode", error)
      }
    }
  }

  // MARK: - Legacy Configure (Deprecated)

  /// Original configure method — kept for backwards compatibility.
  /// Prefer using setPlaybackMode() or setVoiceMode() instead.
  @objc func configure(_ resolve: RCTPromiseResolveBlock,
                       rejecter reject: RCTPromiseRejectBlock) {
    do {
      let session = AVAudioSession.sharedInstance()

      // Force built-in mic route
      if let input = session.availableInputs?.first(where: { $0.portType == .builtInMic }) {
        try session.setPreferredInput(input)
      }

      // Unified category for playback + mic
      try session.setCategory(.playAndRecord,
                              mode: .voiceChat,
                              options: [.mixWithOthers, .defaultToSpeaker])

      // Hardware-safe format
      try session.setPreferredInputNumberOfChannels(1)
      try session.setPreferredSampleRate(48000)
      try session.setPreferredIOBufferDuration(0.01)

      // Activate
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
