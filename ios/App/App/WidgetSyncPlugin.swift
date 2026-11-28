import Capacitor
import WidgetKit

/* Bruecke von der Web-App zum Widget: die Extension laeuft als eigener,
   komplett getrennter Prozess und hat keinen Zugriff auf den Supabase-
   Login der Haupt-App. Diese Bruecke spiegelt bei jeder Session-/Zikr-
   Aenderung den aktuellen Stand in die geteilte Keychain/App-Group
   (SharedSession.swift, von beiden Targets genutzt) und stoesst danach
   einen Reload der Widget-Timelines an, damit die Anzeige sofort
   nachzieht statt erst beim naechsten planmaessigen Update. */
@objc(WidgetSyncPlugin)
public class WidgetSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetSyncPlugin"
    public let jsName = "WidgetSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setZikrCounts", returnType: CAPPluginReturnPromise),
    ]

    @objc func setSession(_ call: CAPPluginCall) {
        guard
            let accessToken = call.getString("accessToken"),
            let refreshToken = call.getString("refreshToken"),
            let userId = call.getString("userId")
        else {
            call.reject("accessToken, refreshToken und userId sind erforderlich")
            return
        }
        let expiresAt = call.getDouble("expiresAt") ?? (Date().timeIntervalSince1970 + 3600)

        SharedSession.save(SharedAuthSession(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: expiresAt,
            userId: userId
        ))
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clearSession(_ call: CAPPluginCall) {
        SharedSession.clear()
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func setZikrCounts(_ call: CAPPluginCall) {
        let counts = SharedZikrCounts(
            zikr1: call.getInt("zikr1") ?? 0,
            zikr2: call.getInt("zikr2") ?? 0,
            zikr3: call.getInt("zikr3") ?? 0,
            dateKey: call.getString("dateKey") ?? ""
        )
        SharedZikr.save(counts)
        WidgetCenter.shared.reloadTimelines(ofKind: "PrayerWidget")
        call.resolve()
    }
}
