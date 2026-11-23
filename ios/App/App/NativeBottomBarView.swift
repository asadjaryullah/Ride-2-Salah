import UIKit

/* Farbwerte 1:1 aus src/app/globals.css uebernommen (--app-surface1,
   --app-border, --app-gold, --app-gold-dim, --app-gold-glow, --app-text3),
   getrennt nach hell/dunkel - siehe dortige :root und
   @media (prefers-color-scheme: dark) / [data-theme="dark"] Bloecke. */
private struct BarColors {
    let surface: UIColor
    let border: UIColor
    let gold: UIColor
    let goldDim: UIColor
    let goldGlow: UIColor
    let text3: UIColor
    let blurStyle: UIBlurEffect.Style

    static let light = BarColors(
        surface: UIColor(red: 0xed / 255, green: 0xe8 / 255, blue: 0xdf / 255, alpha: 0.94),
        border: UIColor(red: 0xdd / 255, green: 0xd5 / 255, blue: 0xc5 / 255, alpha: 1),
        gold: UIColor(red: 0xa0 / 255, green: 0x78 / 255, blue: 0x20 / 255, alpha: 1),
        goldDim: UIColor(red: 0xa0 / 255, green: 0x78 / 255, blue: 0x20 / 255, alpha: 0.10),
        goldGlow: UIColor(red: 0xa0 / 255, green: 0x78 / 255, blue: 0x20 / 255, alpha: 0.20),
        text3: UIColor(red: 0xb0 / 255, green: 0xa0 / 255, blue: 0x80 / 255, alpha: 1),
        blurStyle: .systemUltraThinMaterialLight
    )

    static let dark = BarColors(
        surface: UIColor(red: 0x0f / 255, green: 0x0f / 255, blue: 0x1a / 255, alpha: 0.94),
        border: UIColor(red: 0x2a / 255, green: 0x2a / 255, blue: 0x42 / 255, alpha: 1),
        gold: UIColor(red: 0xC9 / 255, green: 0xA2 / 255, blue: 0x3C / 255, alpha: 1),
        goldDim: UIColor(red: 0xC9 / 255, green: 0xA2 / 255, blue: 0x3C / 255, alpha: 0.15),
        goldGlow: UIColor(red: 0xC9 / 255, green: 0xA2 / 255, blue: 0x3C / 255, alpha: 0.30),
        text3: UIColor(red: 0x44 / 255, green: 0x44 / 255, blue: 0x5a / 255, alpha: 1),
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

private func attributedLabel(_ text: String, color: UIColor) -> NSAttributedString {
    NSMutableAttributedString(string: text, attributes: [
        .font: UIFont.systemFont(ofSize: 9, weight: .bold),
        .foregroundColor: color,
        .kern: 1.1,
    ])
}

/* Ein regulaerer Tab (Namaz/Termine/Fahrt/Profil): Icon in einer
   abgerundeten "Pille", die bei aktivem Tab eingefaerbt wird, Label
   darunter - 1:1 das Muster aus BottomNav.tsx's renderTab(). */
private final class TabButtonView: UIControl {
    let tabId: String
    private let iconSource: IconSource
    private let pill = UIView()
    private let icon = UIImageView()
    private let label = UILabel()
    private(set) var isActiveTab = false

    init(tabId: String, label text: String, iconSource: IconSource) {
        self.tabId = tabId
        self.iconSource = iconSource
        super.init(frame: .zero)
        translatesAutoresizingMaskIntoConstraints = false
        isAccessibilityElement = true
        accessibilityLabel = text

        pill.translatesAutoresizingMaskIntoConstraints = false
        pill.layer.cornerRadius = 10
        pill.isUserInteractionEnabled = false
        addSubview(pill)

        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.contentMode = .scaleAspectFit
        icon.isUserInteractionEnabled = false
        pill.addSubview(icon)

        label.translatesAutoresizingMaskIntoConstraints = false
        label.textAlignment = .center
        label.isUserInteractionEnabled = false
        label.attributedText = attributedLabel(text, color: .clear)
        addSubview(label)

        NSLayoutConstraint.activate([
            pill.topAnchor.constraint(equalTo: topAnchor, constant: 12),
            pill.centerXAnchor.constraint(equalTo: centerXAnchor),
            pill.widthAnchor.constraint(equalToConstant: 44),
            pill.heightAnchor.constraint(equalToConstant: 30),

            icon.centerXAnchor.constraint(equalTo: pill.centerXAnchor),
            icon.centerYAnchor.constraint(equalTo: pill.centerYAnchor),
            icon.widthAnchor.constraint(equalToConstant: 20),
            icon.heightAnchor.constraint(equalToConstant: 20),

            label.topAnchor.constraint(equalTo: pill.bottomAnchor, constant: 6),
            label.centerXAnchor.constraint(equalTo: centerXAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 2),
            label.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -2),
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
            let config = UIImage.SymbolConfiguration(pointSize: 18, weight: active ? .semibold : .regular)
            return UIImage(systemName: name, withConfiguration: config)
        case .asset(let name):
            return UIImage(named: name)?.withRenderingMode(.alwaysTemplate)
        }
    }

    func setActive(_ active: Bool, colors: BarColors) {
        isActiveTab = active
        icon.image = iconImage(active: active)
        icon.tintColor = active ? colors.gold : colors.text3
        pill.backgroundColor = active ? colors.goldDim : .clear
        label.attributedText = attributedLabel(label.attributedText?.string ?? "", color: active ? colors.gold : colors.text3)
    }
}

/* Der schwebende runde "Start"-Knopf in der Mitte - pokt ueber den oberen
   Rand der Bar hinaus (siehe marginTop: -18 im Web-Original), eigene
   Ansicht statt Teil des UIStackView, damit das Ueberlappen moeglich ist. */
private final class HomeButtonView: UIControl {
    private let circle = UIView()
    private let icon = UIImageView()
    private let label = UILabel()
    private(set) var isActiveTab = false

    override init(frame: CGRect) {
        super.init(frame: frame)
        translatesAutoresizingMaskIntoConstraints = false
        isAccessibilityElement = true
        accessibilityLabel = "Start"

        circle.translatesAutoresizingMaskIntoConstraints = false
        circle.layer.cornerRadius = 26
        circle.layer.borderWidth = 2
        circle.layer.shadowOffset = CGSize(width: 0, height: 4)
        circle.layer.shadowRadius = 10
        circle.layer.shadowOpacity = 1
        circle.isUserInteractionEnabled = false
        addSubview(circle)

        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.contentMode = .scaleAspectFit
        icon.isUserInteractionEnabled = false
        circle.addSubview(icon)

        label.translatesAutoresizingMaskIntoConstraints = false
        label.textAlignment = .center
        label.isUserInteractionEnabled = false
        addSubview(label)

        NSLayoutConstraint.activate([
            circle.topAnchor.constraint(equalTo: topAnchor),
            circle.centerXAnchor.constraint(equalTo: centerXAnchor),
            circle.widthAnchor.constraint(equalToConstant: 52),
            circle.heightAnchor.constraint(equalToConstant: 52),

            icon.centerXAnchor.constraint(equalTo: circle.centerXAnchor),
            icon.centerYAnchor.constraint(equalTo: circle.centerYAnchor),
            icon.widthAnchor.constraint(equalToConstant: 22),
            icon.heightAnchor.constraint(equalToConstant: 22),

            label.topAnchor.constraint(equalTo: circle.bottomAnchor, constant: 6),
            label.centerXAnchor.constraint(equalTo: centerXAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 2),
            label.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -2),
        ])

        setActive(false, colors: .light)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    func setActive(_ active: Bool, colors: BarColors) {
        isActiveTab = active
        let config = UIImage.SymbolConfiguration(pointSize: 19, weight: .semibold)
        icon.image = UIImage(systemName: active ? "house.fill" : "house", withConfiguration: config)
        icon.tintColor = active ? .white : colors.gold
        circle.backgroundColor = active ? colors.gold : colors.goldDim
        circle.layer.borderColor = colors.gold.cgColor
        circle.layer.shadowColor = colors.gold.cgColor
        circle.layer.shadowOpacity = active ? 0.5 : 0.25
        label.attributedText = attributedLabel("Start", color: active ? colors.gold : colors.text3)
    }
}

/* Die eigentliche Bottom-Bar: Blur-Hintergrund + 1pt Top-Border + 5
   gleich breite Spalten (Namaz/Termine/[Luecke fuer Start]/Fahrt/Profil),
   der Start-Knopf liegt als eigene, schwebende Ansicht obendrauf - exakte
   Nachbildung von BottomNav.tsx fuer die native iOS-App. */
final class NativeBottomBarView: UIView {
    private let blur = UIVisualEffectView()
    private let topBorder = UIView()
    private let stack = UIStackView()
    private let homeButton = HomeButtonView()
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

        let namaz = TabButtonView(tabId: "namaz", label: "Namaz", iconSource: .asset(name: "NamazIcon"))
        let termine = TabButtonView(tabId: "termine", label: "Termine", iconSource: .symbol(active: "calendar", inactive: "calendar"))
        let spacer = UIView()
        let fahrt = TabButtonView(tabId: "fahrt", label: "Fahrt", iconSource: .symbol(active: "car.fill", inactive: "car"))
        let profil = TabButtonView(tabId: "profil", label: "Profil", iconSource: .symbol(active: "person.fill", inactive: "person"))

        tabButtons = [namaz, termine, fahrt, profil]
        for button in tabButtons {
            button.addTarget(self, action: #selector(handleTabTap(_:)), for: .touchUpInside)
        }

        [namaz, termine, spacer, fahrt, profil].forEach { stack.addArrangedSubview($0) }

        homeButton.translatesAutoresizingMaskIntoConstraints = false
        homeButton.addTarget(self, action: #selector(handleHomeTap), for: .touchUpInside)
        addSubview(homeButton)

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
            stack.heightAnchor.constraint(equalToConstant: 70),
            stack.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor),

            homeButton.centerXAnchor.constraint(equalTo: centerXAnchor),
            homeButton.topAnchor.constraint(equalTo: topAnchor, constant: -8),
            homeButton.widthAnchor.constraint(equalToConstant: 60),
            homeButton.heightAnchor.constraint(equalToConstant: 76),
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
        homeButton.setActive(homeButton.isActiveTab, colors: colors)
    }

    func setTheme(dark: Bool) {
        colors = dark ? .dark : .light
        applyColors()
    }

    func setState(activeTab: String) {
        for button in tabButtons {
            button.setActive(button.tabId == activeTab, colors: colors)
        }
        homeButton.setActive(activeTab == "home", colors: colors)
    }

    @objc private func handleTabTap(_ sender: TabButtonView) {
        onTabTapped?(sender.tabId)
    }

    @objc private func handleHomeTap() {
        onTabTapped?("home")
    }
}
