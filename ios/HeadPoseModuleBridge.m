#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(HeadPoseModule, RCTEventEmitter)

RCT_EXTERN_METHOD(startHeadTracking)
RCT_EXTERN_METHOD(stopHeadTracking)

@end
