import WidgetKit
import SwiftUI

/* Eigenstaendige Widget-Extension: holt die Gebetszeiten direkt per REST
   von Supabase (anon-Schluessel, oeffentliche Leserechte - siehe Migration
   "allow_anon_select_prayer_times"), unabhaengig von der Haupt-App und
   ohne App-Group/Datenaustausch. Gebetszeiten sind ohnehin oeffentliche
   Information (stehen auch am Aushang in der Moschee), ein eigener
   Netzwerkzugriff hier ist deshalb der einfachste, robusteste Weg - keine
   gemeinsame Login-Session noetig, die eine Widget-Extension (eigener,
   schlanker Prozess) ohnehin nicht ohne Weiteres mit der Haupt-App teilen
   kann. */

private let supabaseURL = URL(string: "https://kaqzhlmrftlksivvjvkh.supabase.co/rest/v1/prayer_times?select=name,time&order=sort_order")!
private let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthcXpobG1yZnRsa3NpdnZqdmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Nzc1NzUsImV4cCI6MjA3NzU1MzU3NX0.nynrRnF0FfG9v5EdkP3IWhdgyegVlFtb0sFzo_H9AVo"

private struct PrayerTimeRow: Decodable {
    let name: String
    let time: String // "HH:mm"
}

struct PrayerEntry: TimelineEntry {
    let date: Date
    let prayerName: String
    let prayerDate: Date
}

private func berlinCalendar() -> Calendar {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "Europe/Berlin") ?? .current
    return cal
}

/* Baut aus "HH:mm" den naechsten Zeitpunkt in der Zukunft (heute, oder
   morgen fruehe, falls das Gebet heute schon vorbei ist). */
private func nextOccurrence(ofTime time: String, after reference: Date, calendar: Calendar) -> Date? {
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

private func fetchNextPrayer() async -> PrayerEntry {
    let now = Date()
    let calendar = berlinCalendar()
    let fallback = PrayerEntry(date: now, prayerName: "Gebet", prayerDate: calendar.date(byAdding: .hour, value: 1, to: now) ?? now)

    var request = URLRequest(url: supabaseURL)
    request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")

    do {
        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = try JSONDecoder().decode([PrayerTimeRow].self, from: data)

        var best: PrayerEntry? = nil
        for row in rows {
            guard let occurrence = nextOccurrence(ofTime: row.time, after: now, calendar: calendar) else { continue }
            if best == nil || occurrence < best!.prayerDate {
                best = PrayerEntry(date: now, prayerName: row.name, prayerDate: occurrence)
            }
        }
        return best ?? fallback
    } catch {
        return fallback
    }
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: Date(), prayerName: "Dhuhr", prayerDate: Date().addingTimeInterval(3600))
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        Task {
            completion(await fetchNextPrayer())
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        Task {
            let entry = await fetchNextPrayer()
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
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.prayerName)
                    .font(.headline)
                Text(entry.prayerDate, style: .timer)
                    .font(.caption)
                Text(entry.prayerDate, style: .time)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

        case .systemMedium:
            HStack(spacing: 16) {
                Image(systemName: "moon.stars.fill")
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

        default: // .systemSmall
            VStack(spacing: 6) {
                Image(systemName: "moon.stars.fill")
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

struct PrayerWidget: Widget {
    let kind: String = "PrayerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            PrayerWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Nächstes Gebet")
        .description("Zeigt das naechste Gebet mit Countdown.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

@main
struct PrayerWidgetBundle: WidgetBundle {
    var body: some Widget {
        PrayerWidget()
    }
}
