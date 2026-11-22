import Capacitor

/* Aktiviert die native Wisch-Geste zum Zurueckgehen (vom linken Rand nach
   rechts wischen), die WKWebView eingebaut mitbringt, aber nicht von
   selbst anschaltet. Die App navigiert ueber den Next.js-Router mit
   history.pushState, WKWebView fuehrt diese Eintraege intern in seiner
   eigenen Back/Forward-Liste - die Geste greift darauf direkt zu, inkl.
   der nativen Slide-Animation von Apple selbst, ganz ohne eigenen Code
   dafuer. */
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        webView?.allowsBackForwardNavigationGestures = true
    }
}
