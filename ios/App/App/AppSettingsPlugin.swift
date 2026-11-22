import Capacitor
import UIKit

/* Springt direkt in die App-eigenen Systemeinstellungen. Gleicher Zweck
   wie das Android-Gegenstueck: einmal abgelehnte Berechtigungen koennen
   nur dort, nicht erneut per App-Dialog, zugelassen werden. */
@objc(AppSettingsPlugin)
public class AppSettingsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppSettingsPlugin"
    public let jsName = "AppSettings"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)
    ]

    @objc func open(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("Could not build settings URL")
                return
            }
            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    call.resolve()
                } else {
                    call.reject("Could not open settings")
                }
            }
        }
    }
}
