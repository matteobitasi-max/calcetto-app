import UIKit
import Capacitor
import CoreMotion
import HealthKit

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

    private var navigazione: NavigazioneResistente?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.allowsBackForwardNavigationGestures = false
        // davanti a quello di Capacitor: niente "Nessuna connessione" per un intoppo del 4G
        if let webView, let originale = webView.navigationDelegate {
            let filtro = NavigazioneResistente(originale: originale, bridge: bridge)
            navigazione = filtro
            webView.navigationDelegate = filtro
        }
        bridge?.registerPluginInstance(SalutePlugin())
        avviaScossa()
    }

    private func avviaScossa() {
        guard movimento.isAccelerometerAvailable else { return }
        movimento.accelerometerUpdateInterval = 1.0 / 30
        movimento.startAccelerometerUpdates(to: .main) { [weak self] dati, _ in
            guard let self, let a = dati?.acceleration else { return }
            // a riposo vale circa 1 g (la gravità): uno strattone si stacca molto da 1
            let forza = sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
            guard abs(forza - 1) > 1.0 else { return }
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

// Capacitor mostra la pagina "Nessuna connessione" (offline.html) appena un caricamento della pagina
// non va a buon fine. Sui dati mobili succede anche con internet funzionante: un caricamento interrotto
// da un altro (rete lenta) o un errore momentaneo ("connessione persa", tempo scaduto) che Safari supera
// riprovando da solo. Qui: i caricamenti interrotti si ignorano, gli errori di rete si riprovano fino
// a 3 volte; solo dopo si mostra la pagina, con il codice dell'errore (offline.html riprova da sola).
class NavigazioneResistente: NSObject, WKNavigationDelegate {
    private weak var originale: WKNavigationDelegate?
    private weak var bridge: CAPBridgeProtocol?
    private var tentativi = 0

    init(originale: WKNavigationDelegate, bridge: CAPBridgeProtocol?) {
        self.originale = originale
        self.bridge = bridge
    }

    // tutto il resto lo fa Capacitor
    override func responds(to aSelector: Selector!) -> Bool {
        super.responds(to: aSelector) || (originale?.responds(to: aSelector) ?? false)
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        originale?.responds(to: aSelector) == true ? originale : super.forwardingTarget(for: aSelector)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        tentativi = 0
        originale?.webView?(webView, didFinish: navigation)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        gestisci(webView, error) { originale?.webView?(webView, didFailProvisionalNavigation: navigation, withError: error) }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        gestisci(webView, error) { originale?.webView?(webView, didFail: navigation, withError: error) }
    }

    private func gestisci(_ webView: WKWebView, _ error: Error, altrimenti: () -> Void) {
        let e = error as NSError
        // interrotto da un altro caricamento (o da un link aperto fuori dall'app): non è un problema di rete
        if e.domain == NSURLErrorDomain && e.code == NSURLErrorCancelled { return }
        if e.domain == "WebKitErrorDomain" && e.code == 102 { return }
        let momentanei = [NSURLErrorNetworkConnectionLost, NSURLErrorTimedOut, NSURLErrorCannotConnectToHost,
                          NSURLErrorCannotFindHost, NSURLErrorNotConnectedToInternet, NSURLErrorDNSLookupFailed,
                          NSURLErrorSecureConnectionFailed]
        let indirizzo = (e.userInfo[NSURLErrorFailingURLErrorKey] as? URL) ?? bridge?.config.serverURL
        if e.domain == NSURLErrorDomain && momentanei.contains(e.code) && tentativi < 3, let indirizzo, indirizzo.scheme?.hasPrefix("http") == true {
            tentativi += 1
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { webView.load(URLRequest(url: indirizzo)) }
            return
        }
        tentativi = 0
        // la pagina "Nessuna connessione", con il codice dell'errore (per capire cosa è successo)
        if let pagina = bridge?.config.errorPathURL, var parti = URLComponents(url: pagina, resolvingAgainstBaseURL: false) {
            parti.queryItems = [URLQueryItem(name: "errore", value: "\(e.domain) \(e.code)")]
            if let url = parti.url {
                webView.load(URLRequest(url: url))
                return
            }
        }
        altrimenti()
    }
}

// Apple Salute: i km camminati/corsi registrati (da iPhone, Apple Watch, Garmin...) tra l'inizio
// e la fine della partita. Solo lettura; dalla pagina si usa come plugin "Salute"
// (components/km-partita.tsx).
@objc(SalutePlugin)
public class SalutePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SalutePlugin"
    public let jsName = "Salute"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "distanza", returnType: CAPPluginReturnPromise)]
    private let salute = HKHealthStore()

    @objc func distanza(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let tipo = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning) else {
            call.reject("Apple Salute non è disponibile su questo dispositivo")
            return
        }
        guard let inizioMs = call.getDouble("inizio"), let fineMs = call.getDouble("fine") else {
            call.reject("Orario della partita mancante")
            return
        }
        let inizio = Date(timeIntervalSince1970: inizioMs / 1000)
        let fine = Date(timeIntervalSince1970: fineMs / 1000)
        salute.requestAuthorization(toShare: nil, read: [tipo]) { _, errore in
            if let errore {
                call.reject(errore.localizedDescription)
                return
            }
            let filtro = HKQuery.predicateForSamples(withStart: inizio, end: fine, options: [])
            let query = HKStatisticsQuery(quantityType: tipo, quantitySamplePredicate: filtro, options: .cumulativeSum) { _, statistiche, _ in
                // senza permesso o senza dati Salute restituisce semplicemente 0
                call.resolve(["metri": statistiche?.sumQuantity()?.doubleValue(for: .meter()) ?? 0])
            }
            self.salute.execute(query)
        }
    }
}
