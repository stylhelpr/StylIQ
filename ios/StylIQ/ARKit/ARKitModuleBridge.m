//  ARKitModuleBridge.m
//  StylIQ

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(ARKitModule, RCTEventEmitter)

// Session control
RCT_EXTERN_METHOD(startTracking)
RCT_EXTERN_METHOD(stopTracking)
RCT_EXTERN_METHOD(sendViewReady)

// Mesh rendering
RCT_EXTERN_METHOD(renderMesh:(NSArray *)vertices)

@end
