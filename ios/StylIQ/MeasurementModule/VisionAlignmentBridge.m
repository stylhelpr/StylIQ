#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VisionAlignment, NSObject)

RCT_EXTERN_METHOD(detectAlignment:(NSString *)imagePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
