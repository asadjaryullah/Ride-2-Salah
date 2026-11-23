import Capacitor
import UIKit

/* Native Bottom-Bar (echte UIView statt in der WKWebView gerendertem
   HTML/CSS) - Gegenstueck zu src/lib/native-bottom-bar.ts. Die View selbst
   wird nicht hier in load() angehaengt, sondern von MainViewController
   aus aufgerufen, sobald capacitorDidLoad() feuert - dort ist die
   View-Hierarchie garantiert bereit. */
@objc(NativeBottomBarPlugin)
public class NativeBottomBarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeBottomBarPlugin"
    public let jsName = "NativeBottomBar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTheme", returnType: CAPPluginReturnPromise),
    ]

    private var barView: NativeBottomBarView?

    /* Von MainViewController.capacitorDidLoad() aufgerufen. rootView ist
       der View-Controller, dessen oberste View die WKWebView traegt - die
       Bar liegt als Geschwister-View obendrauf, volle Breite, am unteren
       Rand. Mehrfachaufrufe (z.B. bei App-Resume) haengen die View nicht
       doppelt an. */
    func attach(to rootView: UIView) {
        guard barView == nil else { return }

        let bar = NativeBottomBarView(frame: .zero)
        bar.isHidden = true
        bar.onTabTapped = { [weak self] tab in
            self?.notifyListeners("tabTapped", data: ["tab": tab])
        }
        rootView.addSubview(bar)

        NSLayoutConstraint.activate([
            bar.leadingAnchor.constraint(equalTo: rootView.leadingAnchor),
            bar.trailingAnchor.constraint(equalTo: rootView.trailingAnchor),
            bar.bottomAnchor.constraint(equalTo: rootView.bottomAnchor),
        ])

        barView = bar
    }

    @objc func setState(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        let activeTab = call.getString("activeTab") ?? ""
        DispatchQueue.main.async { [weak self] in
            self?.barView?.isHidden = !visible
            self?.barView?.setState(activeTab: activeTab)
        }
        call.resolve()
    }

    @objc func setTheme(_ call: CAPPluginCall) {
        let dark = call.getString("theme") == "dark"
        DispatchQueue.main.async { [weak self] in
            self?.barView?.setTheme(dark: dark)
        }
        call.resolve()
    }
}
