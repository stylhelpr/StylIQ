#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(StylIQDynamicIslandModule, NSObject)

RCT_EXTERN_METHOD(areActivitiesEnabled:(RCTPromiseResolveBlock)resolve)

RCT_EXTERN_METHOD(startActivity:(NSString *)title
                  withMessage:(NSString *)message)

RCT_EXTERN_METHOD(updateActivity:(NSString *)message)

RCT_EXTERN_METHOD(endActivity)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
