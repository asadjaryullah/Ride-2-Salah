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

        /* Beim Ueberscrollen (Gummiband-Effekt am Seitenende) wurde die
           native Bottom-Bar unbedienbar - die Bar liegt als eigene, fest
           positionierte UIView neben der WKWebView, aber der native
           Gummiband-Bounce der WKWebView kann waehrend des Zurueckfederns
           kurzzeitig mit deren Touch-Handling kollidieren. Die App hat
           ohnehin ein eigenes Pull-to-Refresh per Pointer-Events
           (PullToRefresh.tsx), das natuerliche Scroll-Bounce wird nirgends
           gebraucht - komplett abschalten behebt die Kollision an der
           Wurzel statt nur Symptome zu kaschieren. */
        webView?.scrollView.bounces = false

        /* Eigene, lokale Plugins (nicht aus einem npm-Paket) landen NICHT von
           selbst in capacitor.config.json's packageClassList - das generiert
           `npx cap sync` ausschliesslich aus den ios/-Ordnern installierter
           npm-Capacitor-Plugins (siehe @capacitor/cli/dist/util/iosplugin.js).
           bridge?.plugin(withName:) fand AppSettingsPlugin/NativeBottomBarPlugin
           deshalb nie - beide liefen nie wirklich, obwohl sie kompiliert und
           verlinkt waren. registerPluginInstance(_:) ist der dafuer vorgesehene
           Weg, eine Plugin-Instanz unabhaengig von dieser Auto-Erkennung
           anzumelden, und funktioniert unabhaengig vom autoRegisterPlugins-Schalter
           (anders als registerPluginType(_:), das dabei ein No-Op waere). */
        let barPlugin = NativeBottomBarPlugin()
        bridge?.registerPluginInstance(barPlugin)
        barPlugin.attach(to: view)

        bridge?.registerPluginInstance(AppSettingsPlugin())
    }
}
