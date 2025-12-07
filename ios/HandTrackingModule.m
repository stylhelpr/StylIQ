#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(HandTrackingModule, RCTEventEmitter)
RCT_EXTERN_METHOD(startHandTracking)
RCT_EXTERN_METHOD(stopHandTracking)
@end