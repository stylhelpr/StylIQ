import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    window = UIWindow(frame: UIScreen.main.bounds)

    FirebaseApp.configure()

    // Set up push notifications
    UNUserNotificationCenter.current().delegate = self
    Messaging.messaging().delegate = self

    // Request notification permissions
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
      print("📱 Notification permission granted: \(granted)")
      if let error = error {
        print("❌ Notification permission error: \(error)")
      }
    }
    application.registerForRemoteNotifications()

    factory.startReactNative(
      withModuleName: "StylIQ",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // MARK: - UNUserNotificationCenterDelegate

  // Called when notification is received while app is in foreground
  // For remote FCM notifications, we suppress the native banner since
  // the JS onMessage handler shows a local notification instead.
  // This prevents duplicate banners.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    let userInfo = notification.request.content.userInfo
    print("📬 Foreground notification received: \(userInfo)")

    // Check if this is a local notification (triggered by JS) vs remote (FCM)
    // Local notifications have trigger type UNNotificationTrigger, remote have none or push trigger
    let isLocalNotification = notification.request.trigger is UNTimeIntervalNotificationTrigger ||
                              notification.request.trigger is UNCalendarNotificationTrigger ||
                              notification.request.trigger == nil && notification.request.identifier.hasPrefix("local")

    if notification.request.trigger is UNPushNotificationTrigger {
      // Remote FCM notification - suppress banner, JS will show local notification
      completionHandler([])
    } else {
      // Local notification from JS - show banner, sound, badge
      completionHandler([.banner, .sound, .badge, .list])
    }
  }

  // Called when user taps on notification
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let userInfo = response.notification.request.content.userInfo
    print("📬 Notification tapped: \(userInfo)")
    completionHandler()
  }

  // MARK: - Remote Notifications

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    Messaging.messaging().apnsToken = deviceToken
    print("📱 APNs token registered")
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("❌ Failed to register for remote notifications: \(error)")
  }

  // MARK: - MessagingDelegate

  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    print("🔥 FCM token: \(fcmToken ?? "nil")")
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? { self.bundleURL() }

  override func bundleURL() -> URL? {
#if DEBUG
    return URL(string: "http://192.168.1.152:8081/index.bundle?platform=ios&dev=true")!
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
