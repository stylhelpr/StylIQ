import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // IMPORTANT:
        // Use the window created by AppDelegate + ReactNativeFactory
        // DO NOT create a new RN root here.

        if let appDelegate = UIApplication.shared.delegate as? AppDelegate,
           let existingWindow = appDelegate.window {
            existingWindow.windowScene = windowScene
            self.window = existingWindow
        }
    }
}
