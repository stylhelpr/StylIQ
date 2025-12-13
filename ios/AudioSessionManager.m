#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AudioSessionManager, NSObject)

// Legacy configure method (deprecated)
RCT_EXTERN_METHOD(configure:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Set playback mode for video/audio output (no mic)
RCT_EXTERN_METHOD(setPlaybackMode:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Set voice mode for speech recognition and TTS (mic + speaker)
RCT_EXTERN_METHOD(setVoiceMode:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
