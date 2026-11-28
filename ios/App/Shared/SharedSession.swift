import Foundation
import Security

/* Wird von BEIDEN Targets genutzt (Haupt-App schreibt, Widget-Extension
   liest + erneuert) - deshalb als eine gemeinsame Datei gefuehrt statt
   zweimal aehnlichen Code zu pflegen. Die App-Gruppe (App Group) teilt
   einen Speicherbereich zwischen beiden Prozessen; fuer den Supabase-
   Sitzungstoken wird zusaetzlich die Keychain genutzt (nicht einfaches
   UserDefaults), weil Zugriffstoken sensibel sind. */

let appGroupId = "group.app.ride2salah.mobile"

/* Eine Quelle fuer die Supabase-Projektdaten statt doppelter Konstanten in
   PrayerWidget.swift und hier - beide Targets kompilieren diese Datei. */
enum SupabaseConfig {
    static let baseURL = "https://kaqzhlmrftlksivvjvkh.supabase.co"
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthcXpobG1yZnRsa3NpdnZqdmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Nzc1NzUsImV4cCI6MjA3NzU1MzU3NX0.nynrRnF0FfG9v5EdkP3IWhdgyegVlFtb0sFzo_H9AVo"
}

/* Keychain-Access-Group-Praefix ist der Apple-Team-Identifier - anders als
   in den .entitlements-Dateien kann hier nicht "$(AppIdentifierPrefix)"
   stehen, das ist nur eine Build-Zeit-Ersetzung fuer die Signierung, zur
   Laufzeit braucht die Security-API den fertig aufgeloesten String. */
private let keychainAccessGroup = "SV5PH72UBA.app.ride2salah.mobile.shared"
private let keychainService = "app.ride2salah.mobile.session"
private let keychainAccount = "supabase"

struct SharedAuthSession: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Double // Unix-Zeitstempel (Sekunden)
    let userId: String
}

enum SharedSession {
    static func save(_ session: SharedAuthSession) {
        guard let data = try? JSONEncoder().encode(session) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
            kSecAttrAccessGroup as String: keychainAccessGroup,
        ]
        SecItemDelete(query as CFDictionary)
        var attributes = query
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func clear() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
            kSecAttrAccessGroup as String: keychainAccessGroup,
        ]
        SecItemDelete(query as CFDictionary)
    }

    static func load() -> SharedAuthSession? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
            kSecAttrAccessGroup as String: keychainAccessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return try? JSONDecoder().decode(SharedAuthSession.self, from: data)
    }
}

/* Reiner Lesezugriff fuers Widget: liefert einen Token zurueck, der noch
   mindestens 60s gueltig ist - erneuert noetigenfalls selbststaendig per
   Supabase-Refresh-Endpunkt, damit "Fahrt anbieten" auch dann noch
   funktioniert, wenn die App selbst schon laenger nicht geoeffnet wurde. */
enum SupabaseAuthRefresh {
    private static let refreshURL = URL(string: "\(SupabaseConfig.baseURL)/auth/v1/token?grant_type=refresh_token")!

    private struct RefreshResponse: Decodable {
        let access_token: String
        let refresh_token: String
        let expires_in: Double
        let user: UserObject?
        struct UserObject: Decodable { let id: String }
    }

    static func validSession() async -> SharedAuthSession? {
        guard let session = SharedSession.load() else { return nil }
        let now = Date().timeIntervalSince1970
        if session.expiresAt - now > 60 { return session }

        var request = URLRequest(url: refreshURL)
        request.httpMethod = "POST"
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(["refresh_token": session.refreshToken])

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            let decoded = try JSONDecoder().decode(RefreshResponse.self, from: data)
            let refreshed = SharedAuthSession(
                accessToken: decoded.access_token,
                refreshToken: decoded.refresh_token,
                expiresAt: Date().timeIntervalSince1970 + decoded.expires_in,
                userId: decoded.user?.id ?? session.userId
            )
            SharedSession.save(refreshed)
            return refreshed
        } catch {
            return nil
        }
    }
}

/* Zikr-Zaehler: unkritische, nicht-geheime Zahlen - normales App-Group-
   UserDefaults reicht, keine Keychain noetig. Wird von der App bei jeder
   Aenderung geschrieben, das Widget liest nur. */
struct SharedZikrCounts: Codable {
    let zikr1: Int
    let zikr2: Int
    let zikr3: Int
    let dateKey: String // "YYYY-MM-DD" (Europe/Berlin) - fuer Tagesabgleich
}

enum SharedZikr {
    private static let storageKey = "zikr_counts_today"

    static func save(_ counts: SharedZikrCounts) {
        guard let data = try? JSONEncoder().encode(counts) else { return }
        UserDefaults(suiteName: appGroupId)?.set(data, forKey: storageKey)
    }

    static func load() -> SharedZikrCounts? {
        guard let data = UserDefaults(suiteName: appGroupId)?.data(forKey: storageKey) else { return nil }
        return try? JSONDecoder().decode(SharedZikrCounts.self, from: data)
    }
}
