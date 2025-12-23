#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ImageSaverModule, NSObject)

RCT_EXTERN_METHOD(saveImageFromUrl:(NSString *)urlString
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
