#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(EmotionModule, RCTEventEmitter)

RCT_EXTERN_METHOD(startEmotionTracking)
RCT_EXTERN_METHOD(stopEmotionTracking)

@end
