import WidgetKit
import SwiftUI

/* Holt die Gebetszeiten direkt per REST von Supabase (anon-Schluessel,
   oeffentliche Leserechte - siehe Migration "allow_anon_select_prayer_times").
   Oeffentliche Information, deshalb bewusst ohne Login - anders als die
   Zikr-Zahlen (SharedZikr, lokal aus der App-Group) und "Fahrt anbieten"
   (RideActions.swift, braucht den echten Nutzer-Token aus SharedSession). */

private let prayerTimesURL = URL(string: "\(SupabaseConfig.baseURL)/rest/v1/prayer_times?select=id,name,time&order=sort_order")!

private struct PrayerTimeRow: Decodable {
    let id: String
    let name: String
    let time: String // "HH:mm"
}

/* Einfache, klar erkennbare SF-Symbole statt Kalligraphie - auf dem Lock
   Screen sowieso einfarbig, auf dem Home-Screen-Dashboard in Markenfarbe. */
func prayerIconName(for id: String) -> String {
    switch id {
    case "fajr": return "sunrise.fill"
    case "dhuhr": return "sun.max.fill"
    case "asr": return "sun.min.fill"
    case "maghrib": return "sunset.fill"
    case "isha": return "moon.stars.fill"
    default: return "clock.fill"
    }
}

struct PrayerSlot {
    let id: String
    let name: String
    let time: String
    let occurrence: Date
}

struct PrayerEntry: TimelineEntry {
    let date: Date
    let prayerName: String
    let prayerDate: Date
    let nextPrayerId: String
    let allPrayers: [PrayerSlot] // sortiert, alle 5 mit ihrem naechsten Eintreffzeitpunkt
    let zikr: SharedZikrCounts?
}

func berlinCalendar() -> Calendar {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "Europe/Berlin") ?? .current
    return cal
}

/* Baut aus "HH:mm" den naechsten Zeitpunkt in der Zukunft (heute, oder
   morgen fruehe, falls das Gebet heute schon vorbei ist). */
func nextOccurrence(ofTime time: String, after reference: Date, calendar: Calendar) -> Date? {
    let parts = time.split(separator: ":").compactMap { Int($0) }
    guard parts.count == 2 else { return nil }
    var comps = calendar.dateComponents([.year, .month, .day], from: reference)
    comps.hour = parts[0]
    comps.minute = parts[1]
    comps.second = 0
    guard let candidate = calendar.date(from: comps) else { return nil }
    if candidate > reference { return candidate }
    return calendar.date(byAdding: .day, value: 1, to: candidate)
}

/* Von Widget-Timeline UND "Fahrt anbieten"-AppIntent genutzt (RideActions.swift)
   - beide muessen unabhaengig voneinander wissen, welches Gebet als naechstes
   drankommt, ohne dass eine Seite von der anderen abhaengt. */
func fetchPrayerSlots() async throws -> [PrayerSlot] {
    let now = Date()
    let calendar = berlinCalendar()

    var request = URLRequest(url: prayerTimesURL)
    request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(SupabaseConfig.anonKey)", forHTTPHeaderField: "Authorization")

    let (data, _) = try await URLSession.shared.data(for: request)
    let rows = try JSONDecoder().decode([PrayerTimeRow].self, from: data)

    var slots: [PrayerSlot] = []
    for row in rows {
        guard let occurrence = nextOccurrence(ofTime: row.time, after: now, calendar: calendar) else { continue }
        slots.append(PrayerSlot(id: row.id, name: row.name, time: row.time, occurrence: occurrence))
    }
    return slots
}

private func fetchPrayerEntry() async -> PrayerEntry {
    let now = Date()
    let calendar = berlinCalendar()
    let fallbackDate = calendar.date(byAdding: .hour, value: 1, to: now) ?? now
    let zikr = SharedZikr.load()
    let fallback = PrayerEntry(
        date: now, prayerName: "Gebet", prayerDate: fallbackDate,
        nextPrayerId: "", allPrayers: [], zikr: zikr
    )

    do {
        let slots = try await fetchPrayerSlots()
        guard let next = slots.min(by: { $0.occurrence < $1.occurrence }) else { return fallback }

        return PrayerEntry(
            date: now, prayerName: next.name, prayerDate: next.occurrence,
            nextPrayerId: next.id, allPrayers: slots, zikr: zikr
        )
    } catch {
        return fallback
    }
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(
            date: Date(), prayerName: "Dhuhr", prayerDate: Date().addingTimeInterval(3600),
            nextPrayerId: "dhuhr", allPrayers: [], zikr: nil
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        Task {
            completion(await fetchPrayerEntry())
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        Task {
            let entry = await fetchPrayerEntry()
            // Neu laden, sobald das angezeigte Gebet erreicht ist - zeigt dann
            // automatisch das jeweils naechste. Zusaetzliche Sicherheits-
            // Aktualisierung nach spaetestens 30 Minuten, falls der
            // Netzwerk-Request einmal fehlschlug und der Fallback-Wert steht.
            let safetyReload = Date().addingTimeInterval(30 * 60)
            let reloadDate = min(entry.prayerDate, safetyReload)
            completion(Timeline(entries: [entry], policy: .after(reloadDate)))
        }
    }
}

struct PrayerWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryInline:
            Text("\(entry.prayerName) ") + Text(entry.prayerDate, style: .timer)

        case .accessoryCircular:
            ProgressView(timerInterval: Date()...entry.prayerDate, countsDown: true) {
                Text(entry.prayerName)
            } currentValueLabel: {
                Text(entry.prayerDate, style: .timer)
                    .font(.system(size: 11))
            }
            .progressViewStyle(.circular)

        case .accessoryRectangular:
            // Alle 5 Gebete auf einen Blick - sehr wenig Platz, deshalb nur
            // Icon + Uhrzeit pro Spalte, das naechste Gebet hervorgehoben.
            HStack(spacing: 7) {
                ForEach(entry.allPrayers, id: \.id) { slot in
                    VStack(spacing: 1) {
                        Image(systemName: prayerIconName(for: slot.id))
                            .font(.system(size: 11))
                        Text(slot.time)
                            .font(.system(size: 9, weight: .semibold, design: .rounded))
                            .minimumScaleFactor(0.7)
                    }
                    .opacity(slot.id == entry.nextPrayerId ? 1.0 : 0.55)
                }
            }

        case .systemMedium:
            HStack(spacing: 16) {
                Image(systemName: prayerIconName(for: entry.nextPrayerId))
                    .font(.system(size: 34))
                    .foregroundStyle(.orange)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Nächstes Gebet")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(entry.prayerName)
                        .font(.title2).bold()
                    Text(entry.prayerDate, style: .timer)
                        .font(.title3)
                        .foregroundStyle(.orange)
                }
                Spacer()
            }
            .padding()

        case .systemLarge:
            PrayerDashboardView(entry: entry)

        default: // .systemSmall
            VStack(spacing: 6) {
                Image(systemName: prayerIconName(for: entry.nextPrayerId))
                    .font(.system(size: 22))
                    .foregroundStyle(.orange)
                Text(entry.prayerName)
                    .font(.headline)
                Text(entry.prayerDate, style: .timer)
                    .font(.subheadline)
                    .foregroundStyle(.orange)
                Text(entry.prayerDate, style: .time)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding()
        }
    }
}

/* Markenfarben 1:1 aus globals.css (Dark-Mode-Werte, da das Widget im
   System-Darkmode-Look am meisten getestet wird; SwiftUI-Farben passen
   sich hier bewusst nicht automatisch an den Light-Wert an, weil das
   Widget ohnehin ueberwiegend auf dunklem Homescreen-Hintergrund liegt). */
private let brandGold = Color(red: 0.788, green: 0.635, blue: 0.235)   // #C9A23C
private let brandEmerald = Color(red: 0.231, green: 0.639, blue: 0.463) // #3BA376

private struct PrayerDashboardView: View {
    let entry: PrayerEntry

    private var zikrPercent: Double {
        guard let z = entry.zikr else { return 0 }
        let targets = [200.0, 100.0, 100.0]
        let counts = [Double(z.zikr1), Double(z.zikr2), Double(z.zikr3)]
        let ratios = zip(counts, targets).map { min($0 / $1, 1.0) }
        return ratios.reduce(0, +) / Double(ratios.count) * 100
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Gebetszeiten")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(brandGold)

            ForEach(entry.allPrayers, id: \.id) { slot in
                let isNext = slot.id == entry.nextPrayerId
                HStack(spacing: 10) {
                    Image(systemName: prayerIconName(for: slot.id))
                        .font(.system(size: 14))
                        .foregroundStyle(isNext ? brandEmerald : .secondary)
                        .frame(width: 18)
                    Text(slot.name)
                        .font(.subheadline)
                        .fontWeight(isNext ? .bold : .regular)
                    Spacer()
                    Text(slot.time)
                        .font(.subheadline.monospacedDigit())
                        .fontWeight(isNext ? .bold : .regular)
                        .foregroundStyle(isNext ? brandEmerald : .primary)
                }
                .padding(.vertical, isNext ? 4 : 0)
                .padding(.horizontal, isNext ? 8 : 0)
                .background(
                    isNext ? brandEmerald.opacity(0.12) : Color.clear,
                    in: RoundedRectangle(cornerRadius: 8)
                )
            }

            Spacer(minLength: 2)

            if let z = entry.zikr {
                HStack(spacing: 8) {
                    ProgressView(value: zikrPercent, total: 100)
                        .tint(brandGold)
                    Text("Zikr \(Int(zikrPercent))%")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .fixedSize()
                }
            }

            Button(intent: OfferRideIntent()) {
                Label("Fahrt anbieten", systemImage: "car.fill")
                    .font(.caption.weight(.semibold))
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(brandEmerald)
        }
        .padding(14)
    }
}

struct PrayerWidget: Widget {
    let kind: String = "PrayerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            PrayerWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Gebetszeiten")
        .description("Naechstes Gebet, alle Gebetszeiten und Zikr-Fortschritt.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

@main
struct PrayerWidgetBundle: WidgetBundle {
    var body: some Widget {
        PrayerWidget()
    }
}
