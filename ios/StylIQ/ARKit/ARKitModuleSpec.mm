#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_REMAP_MODULE(ARKitModule, ARKitModule, RCTEventEmitter)

RCT_EXTERN_METHOD(startTracking)
RCT_EXTERN_METHOD(stopTracking)

@end
