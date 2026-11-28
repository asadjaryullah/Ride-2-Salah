import AppIntents
import WidgetKit
import Foundation

/* "Fahrt anbieten" direkt aus dem Widget heraus, ohne die App zu oeffnen -
   deshalb ein echter Netzwerk-Request mit dem im SharedSession/Keychain
   hinterlegten Nutzer-Token (siehe SharedSession.swift), nicht nur ein
   Deep-Link. Spiegelt den Insert aus select-prayer/page.tsx moeglichst
   genau, damit die so angelegte Fahrt sich fuer Mitfahrer nicht anders
   verhaelt als eine normal in der App angebotene. */

private struct ProfileRow: Decodable {
    let full_name: String?
    let phone: String?
    let gender: String?
}

private func fetchProfile(userId: String, accessToken: String) async throws -> ProfileRow? {
    var components = URLComponents(string: "\(SupabaseConfig.baseURL)/rest/v1/profiles")!
    components.queryItems = [
        URLQueryItem(name: "id", value: "eq.\(userId)"),
        URLQueryItem(name: "select", value: "full_name,phone,gender"),
    ]
    var request = URLRequest(url: components.url!)
    request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

    let (data, _) = try await URLSession.shared.data(for: request)
    let rows = try JSONDecoder().decode([ProfileRow].self, from: data)
    return rows.first
}

private struct RideIdRow: Decodable {
    let id: String
}

private func hasExistingRide(driverId: String, prayerId: String, rideDate: String, accessToken: String) async throws -> Bool {
    var components = URLComponents(string: "\(SupabaseConfig.baseURL)/rest/v1/rides")!
    components.queryItems = [
        URLQueryItem(name: "driver_id", value: "eq.\(driverId)"),
        URLQueryItem(name: "prayer_id", value: "eq.\(prayerId)"),
        URLQueryItem(name: "ride_date", value: "eq.\(rideDate)"),
        URLQueryItem(name: "status", value: "eq.active"),
        URLQueryItem(name: "select", value: "id"),
    ]
    var request = URLRequest(url: components.url!)
    request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

    let (data, _) = try await URLSession.shared.data(for: request)
    let rows = try JSONDecoder().decode([RideIdRow].self, from: data)
    return !rows.isEmpty
}

private func insertRide(
    driverId: String, profile: ProfileRow, prayerId: String, prayerTime: String,
    rideDate: String, accessToken: String
) async throws -> Bool {
    let url = URL(string: "\(SupabaseConfig.baseURL)/rest/v1/rides")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("return=minimal", forHTTPHeaderField: "Prefer")

    let body: [String: Any] = [
        "driver_id": driverId,
        "driver_name": profile.full_name ?? "Unbekannt",
        "driver_phone": profile.phone ?? "",
        "driver_gender": profile.gender ?? "male",
        "prayer_id": prayerId,
        "prayer_time": prayerTime,
        "ride_date": rideDate,
        "status": "active",
    ]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (_, response) = try await URLSession.shared.data(for: request)
    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
    return status == 201
}

private func isoDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.timeZone = TimeZone(identifier: "Europe/Berlin")
    return formatter.string(from: date)
}

struct OfferRideIntent: AppIntent {
    static var title: LocalizedStringResource = "Fahrt anbieten"
    static var description = IntentDescription("Bietet eine Fahrt zum naechsten Gebet an, ohne die App zu oeffnen.")

    /* Ein Tap auf einen interaktiven Widget-Button fuehrt den AppIntent im
       Hintergrund aus - iOS zeigt dabei verlaesslich KEINEN sichtbaren
       System-Dialog an (das .result(dialog:) ist fuer Siri/Kurzbefehle
       gedacht, nicht fuer Widget-Taps). Deshalb wird das Ergebnis zusaetzlich
       in SharedRideStatus abgelegt und ein Reload angestossen, damit die
       Dashboard-Ansicht die Rueckmeldung direkt zeigt. */
    private func finish(_ message: String, success: Bool) -> some IntentResult & ProvidesDialog {
        SharedRideStatus.save(message: message, success: success)
        WidgetCenter.shared.reloadAllTimelines()
        return .result(dialog: IntentDialog(stringLiteral: message))
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let session = await SupabaseAuthRefresh.validSession() else {
            return finish("Bitte einmal die App oeffnen und anmelden, dann klappt das auch vom Sperrbildschirm aus.", success: false)
        }

        let slots: [PrayerSlot]
        do {
            slots = try await fetchPrayerSlots()
        } catch {
            return finish("Gebetszeiten konnten gerade nicht geladen werden.", success: false)
        }
        guard let next = slots.min(by: { $0.occurrence < $1.occurrence }) else {
            return finish("Kein Gebet gefunden.", success: false)
        }
        let rideDate = isoDate(next.occurrence)

        guard let profile = try? await fetchProfile(userId: session.userId, accessToken: session.accessToken) else {
            return finish("Profil nicht gefunden - bitte in der App einmal vervollstaendigen.", success: false)
        }

        if (try? await hasExistingRide(driverId: session.userId, prayerId: next.id, rideDate: rideDate, accessToken: session.accessToken)) == true {
            return finish("Du bietest \(next.name) heute schon an.", success: false)
        }

        let ok = (try? await insertRide(
            driverId: session.userId, profile: profile, prayerId: next.id,
            prayerTime: next.time, rideDate: rideDate, accessToken: session.accessToken
        )) ?? false

        if ok {
            return finish("Fahrt zum \(next.name) angeboten!", success: true)
        } else {
            return finish("Fahrt konnte nicht angelegt werden.", success: false)
        }
    }
}
