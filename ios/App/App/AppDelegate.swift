import UIKit
import Capacitor
import CoreMotion

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Scuotere il telefono mostra la foto sorpresa (components/scuoti-foto.tsx),
        // non il messaggio di iOS "Annulla digitazione".
        application.applicationSupportsShakeToEdit = false
        return true
    }

    // Notifiche: consegna al plugin Firebase il token APNs del dispositivo e le notifiche ricevute.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        NotificationCenter.default.post(name: Notification.Name.init("didReceiveRemoteNotification"), object: completionHandler, userInfo: userInfo)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

// La vista dell'app: come quella di Capacitor. Il gesto dal bordo lo gestisce la pagina
// (components/swipe-indietro.tsx), che passa da una sezione all'altra del menu: il gesto
// nativo del browser va spento, altrimenti salterebbe alla pagina visitata prima.
//
// La scossa del telefono la riconosce qui l'accelerometro e la segnala alla pagina con
// l'evento "scossa" (components/scuoti-foto.tsx mostra una foto sorpresa).
class MainViewController: CAPBridgeViewController {
    private let movimento = CMMotionManager()
    private var strattoni: [Date] = []
    private var ferma = Date.distantPast

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.allowsBackForwardNavigationGestures = false
        avviaScossa()
    }

    private func avviaScossa() {
        guard movimento.isAccelerometerAvailable else { return }
        movimento.accelerometerUpdateInterval = 1.0 / 30
        movimento.startAccelerometerUpdates(to: .main) { [weak self] dati, _ in
            guard let self, let a = dati?.acceleration else { return }
            // a riposo vale circa 1 g (la gravità): uno strattone si stacca molto da 1
            let forza = sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
            guard abs(forza - 1) > 1.2 else { return }
            let ora = Date()
            guard ora > self.ferma else { return }
            self.strattoni = self.strattoni.filter { ora.timeIntervalSince($0) < 1.2 } + [ora]
            if self.strattoni.count >= 3 {
                self.strattoni = []
                self.ferma = ora.addingTimeInterval(2)
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                self.webView?.evaluateJavaScript("window.dispatchEvent(new Event('scossa'))")
            }
        }
    }
}
