import UIKit

/* Farbwerte 1:1 aus src/app/globals.css uebernommen (--app-surface1,
   --app-border, --app-gold, --app-text3), getrennt nach hell/dunkel - siehe
   dortige :root und @media (prefers-color-scheme: dark) / [data-theme="dark"]
   Bloecke. */
private struct BarColors {
    let surface: UIColor
    let border: UIColor
    let gold: UIColor
    let text3: UIColor
    let blurStyle: UIBlurEffect.Style

    static let light = BarColors(
        surface: UIColor(red: 0xed / 255, green: 0xe8 / 255, blue: 0xdf / 255, alpha: 0.94),
        border: UIColor(red: 0xdd / 255, green: 0xd5 / 255, blue: 0xc5 / 255, alpha: 1),
        gold: UIColor(red: 0xa0 / 255, green: 0x78 / 255, blue: 0x20 / 255, alpha: 1),
        text3: UIColor(red: 0x7a / 255, green: 0x6a / 255, blue: 0x50 / 255, alpha: 1),
        blurStyle: .systemUltraThinMaterialLight
    )

    static let dark = BarColors(
        surface: UIColor(red: 0x0f / 255, green: 0x0f / 255, blue: 0x1a / 255, alpha: 0.94),
        border: UIColor(red: 0x2a / 255, green: 0x2a / 255, blue: 0x42 / 255, alpha: 1),
        gold: UIColor(red: 0xC9 / 255, green: 0xA2 / 255, blue: 0x3C / 255, alpha: 1),
        text3: UIColor(red: 0x8a / 255, green: 0x8a / 255, blue: 0xa0 / 255, alpha: 1),
        blurStyle: .systemUltraThinMaterialDark
    )
}

/* Woher ein Tab sein Icon bekommt: entweder ein SF-Symbol-Paar (aktiv/
   inaktiv), oder - fuer Namaz, wofuer es kein passendes SF-Symbol gibt -
   ein eigenes Template-Image-Asset (NamazIcon.imageset), dessen Tint sich
   nur ueber die Farbe aendert, nicht ueber ein zweites Bild. */
private enum IconSource {
    case symbol(active: String, inactive: String)
    case asset(name: String)
}

/* Instagram-Stil: reine Icon-Reihe ohne Textlabel, kein schwebender
   Start-Knopf - nur die Form (umrandet/gefuellt) und die Farbe zeigen,
   welcher Tab aktiv ist. Alle 5 Tabs (inkl. Start) werden gleich
   behandelt, keine Sonderrolle mehr fuer die Mitte. */
private final class TabButtonView: UIControl {
    let tabId: String
    private let iconSource: IconSource
    private let icon = UIImageView()
    private(set) var isActiveTab = false

    init(tabId: String, accessibilityLabel text: String, iconSource: IconSource) {
        self.tabId = tabId
        self.iconSource = iconSource
        super.init(frame: .zero)
        translatesAutoresizingMaskIntoConstraints = false
        isAccessibilityElement = true
        accessibilityLabel = text

        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.contentMode = .scaleAspectFit
        icon.isUserInteractionEnabled = false
        addSubview(icon)

        NSLayoutConstraint.activate([
            icon.centerXAnchor.constraint(equalTo: centerXAnchor),
            icon.centerYAnchor.constraint(equalTo: centerYAnchor),
            icon.widthAnchor.constraint(equalToConstant: 27),
            icon.heightAnchor.constraint(equalToConstant: 27),
        ])

        // Verhindert einen kurzen Blanko-Blitz vor dem ersten setState()-Aufruf
        // aus JS - wird gleich danach ohnehin mit den echten Werten ueberschrieben.
        setActive(false, colors: .light)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    private func iconImage(active: Bool) -> UIImage? {
        switch iconSource {
        case .symbol(let activeName, let inactiveName):
            let name = active ? activeName : inactiveName
            let config = UIImage.SymbolConfiguration(pointSize: 23, weight: active ? .semibold : .regular)
            return UIImage(systemName: name, withConfiguration: config)
        case .asset(let name):
            return UIImage(named: name)?.withRenderingMode(.alwaysTemplate)
        }
    }

    func setActive(_ active: Bool, colors: BarColors) {
        isActiveTab = active
        icon.image = iconImage(active: active)
        icon.tintColor = active ? colors.gold : colors.text3
    }
}

/* Die eigentliche Bottom-Bar: Blur-Hintergrund + 1pt Top-Border + 5
   gleich breite, reine Icon-Spalten (Zikr/Termine/Start/Fahrt/Profil) -
   Instagram-Stil, kein Textlabel, kein schwebender Start-Knopf mehr. */
final class NativeBottomBarView: UIView {
    private let blur = UIVisualEffectView()
    private let topBorder = UIView()
    private let stack = UIStackView()
    private var tabButtons: [TabButtonView] = []
    private var colors: BarColors = .light

    var onTabTapped: ((String) -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        translatesAutoresizingMaskIntoConstraints = false
        clipsToBounds = false

        blur.translatesAutoresizingMaskIntoConstraints = false
        addSubview(blur)

        topBorder.translatesAutoresizingMaskIntoConstraints = false
        addSubview(topBorder)

        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        addSubview(stack)

        let namaz = TabButtonView(tabId: "namaz", accessibilityLabel: "Zikr", iconSource: .symbol(active: "book.fill", inactive: "book"))
        let termine = TabButtonView(tabId: "termine", accessibilityLabel: "Termine", iconSource: .symbol(active: "calendar.circle.fill", inactive: "calendar"))
        let home = TabButtonView(tabId: "home", accessibilityLabel: "Start", iconSource: .symbol(active: "house.fill", inactive: "house"))
        let fahrt = TabButtonView(tabId: "fahrt", accessibilityLabel: "Fahrt", iconSource: .symbol(active: "car.fill", inactive: "car"))
        let profil = TabButtonView(tabId: "profil", accessibilityLabel: "Profil", iconSource: .symbol(active: "person.fill", inactive: "person"))

        tabButtons = [namaz, termine, home, fahrt, profil]
        for button in tabButtons {
            button.addTarget(self, action: #selector(handleTabTap(_:)), for: .touchUpInside)
            stack.addArrangedSubview(button)
        }

        NSLayoutConstraint.activate([
            blur.topAnchor.constraint(equalTo: topAnchor),
            blur.leadingAnchor.constraint(equalTo: leadingAnchor),
            blur.trailingAnchor.constraint(equalTo: trailingAnchor),
            blur.bottomAnchor.constraint(equalTo: bottomAnchor),

            topBorder.topAnchor.constraint(equalTo: topAnchor),
            topBorder.leadingAnchor.constraint(equalTo: leadingAnchor),
            topBorder.trailingAnchor.constraint(equalTo: trailingAnchor),
            topBorder.heightAnchor.constraint(equalToConstant: 1),

            stack.topAnchor.constraint(equalTo: topAnchor),
            stack.leadingAnchor.constraint(equalTo: leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor),
            stack.heightAnchor.constraint(equalToConstant: 56),
            stack.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor),
        ])

        applyColors()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    private func applyColors() {
        blur.effect = UIBlurEffect(style: colors.blurStyle)
        backgroundColor = .clear
        topBorder.backgroundColor = colors.border
        // Farb-Tint ueber dem Blur, entspricht color-mix(... --app-surface1 94%, transparent) im Web.
        blur.contentView.backgroundColor = colors.surface

        for button in tabButtons {
            button.setActive(button.isActiveTab, colors: colors)
        }
    }

    func setTheme(dark: Bool) {
        colors = dark ? .dark : .light
        applyColors()
    }

    func setState(activeTab: String) {
        for button in tabButtons {
            button.setActive(button.tabId == activeTab, colors: colors)
        }
    }

    @objc private func handleTabTap(_ sender: TabButtonView) {
        onTabTapped?(sender.tabId)
    }
}
