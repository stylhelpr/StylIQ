#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MeasurementModule, NSObject)

RCT_EXTERN_METHOD(
  measureBody:(NSDictionary *)params
  resolver:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

@end
