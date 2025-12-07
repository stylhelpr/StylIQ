// StylIQDynamicIslandModule.m

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(StylIQDynamicIslandModule, NSObject)

RCT_EXTERN_METHOD(canStart:(RCTResponseSenderBlock)callback)

RCT_EXTERN_METHOD(areActivitiesEnabled:
                  (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startActivity:
                  (NSString *)title
                  withMessage:(NSString *)message
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateActivity:
                  (NSString *)message
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endActivity:
                  (RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

// 🔥🔥🔥 THE MISSING METHOD — this is why resetAll never worked
RCT_EXTERN_METHOD(endAllActivities:
                  (RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
