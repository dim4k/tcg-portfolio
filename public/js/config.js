// Global Configuration
export const CONFIG = {
    BIRTH_DATE: "1988-05-01",
    CAREER_START_DATE: "2011-05-01",
    // Absolute origin, used for the share preview. Keep in sync with the og:* tags in index.html.
    SITE_URL: "https://antoine.kim/",
    // Keep in sync with the 600px media queries in responsive.css and tcg-card.css.
    MOBILE_BREAKPOINT: 600,
    // Must match the .slide-out transition duration in tcg-card.css (0.4s).
    ANIMATION_DELAY: 400,
    ANIMATION_BUFFER: 100,
    // Deepest rank still drawn in the stack; anything further back is hidden.
    MAX_STACK_DEPTH: 2,
    // One trackpad flick emits dozens of events; one mouse notch is ~100.
    WHEEL_THRESHOLD: 50,
    // Pointer travel (px) below which a press on the front card is a click, not a drag.
    DRAG_START_DISTANCE: 6,
    // A released card is thrown past this distance (px) or this speed (px/ms).
    THROW_DISTANCE: 110,
    THROW_VELOCITY: 0.6,
    // Card rotation (deg) per pixel dragged sideways.
    DRAG_ROTATION: 0.06,
    GYRO_SENSITIVITY: 0.5,
    GYRO_MAX_ROTATION: 15,
    // Phone tilt (deg) that moves the light most of the way to the card's edge.
    GYRO_LIGHT_RANGE: 20,
    // How fast (ms) the rest position follows the way the phone is held: tilting moves the
    // card, holding it differently does not leave it stuck in a corner.
    GYRO_RECENTER: 2000,
    // Share of the way to the new tilt covered on each frame: smooths the sensor's noise.
    GYRO_SMOOTHING: 0.25,
    MOUSE_ROTATION_FACTOR: 10,
    // Tilt applied to the hovered card. The deck's own perspective lives in base.css.
    TILT_PERSPECTIVE: 1000,
    TILT_SCALE: 1.02,
    GLARE_MOUSE: 1,
    GLARE_GYRO: 0.8,
    // Delay before the light sweep that shows off the holo foil on a new front card.
    SHINE_DELAY: 350,
    // localStorage keys (collection.js). The ids of the sets opened, comma separated, i.e. the
    // sets in the deck: the booster intro plays only while it is empty (mirrored in
    // index.html). The slugs of the cards seen, and the ids of the sets the visitor already
    // knew about, so a set added since their last visit shows as new.
    BOOSTER_KEY: "tcg-booster-opened",
    SEEN_KEY: "tcg-seen",
    KNOWN_KEY: "tcg-known-sets",
    // A card counts as seen once it stays this long (ms) in front of the deck, is flipped, or is
    // taken out of its binder pocket: leafing through with the scrubber does not count. Until
    // then it wears a "new" badge.
    SEEN_DWELL: 200,
    // Icon for the deck<->binder view toggle button, keyed by current view. The labels are in
    // the locales (view.deck, view.binder).
    VIEW_TOGGLE: {
        deck: { icon: "book-open", label: "view.binder" },
        binder: { icon: "layer-group", label: "view.deck" },
    },
    // Card rarities, in rising order. A card gets one with `rarity: "rare"`, `"gold"` or
    // `"secret"`; without it, it is common. Each rarity has its own finish (tcg-card.css), a
    // symbol before the collector number, and its reveal in the booster, where it comes out
    // after the commons: the halo for a rare, the back cracking open for a gold, a supernova
    // for a secret. Face down on top of the stack, each glows through its back, more and more
    // from rare to secret (effects.css); `rays`: light rays turn behind it too. Labels are in
    // the locales (rarity.rare...).
    RARITIES: {
        rare: { symbol: "★", reveal: "halo" },
        gold: { symbol: "★★", reveal: "cracks", rays: true },
        secret: { symbol: "★★★", reveal: "nova", rays: true },
    },
    SOCIAL: {
        linkedin: {
            url: "https://www.linkedin.com/in/antoine-kim/",
            icon: "linkedin",
            label: "LinkedIn",
            brand: "#0077b5",
        },
        email: {
            url: "mailto:contact@antoine.kim",
            icon: "envelope",
            label: "Email",
            brand: "#ea4335",
            // mailto does nothing without a configured mail client, so the address can be copied too.
            copy: "contact@antoine.kim",
        },
        github: {
            url: "https://github.com/dim4k",
            icon: "github",
            label: "GitHub",
            brand: "#333",
        },
        twitter: {
            url: "https://x.com/AntoineKim_",
            icon: "twitter",
            label: "Twitter",
            brand: "#1da1f2",
        },
        instagram: {
            url: "https://www.instagram.com/mikotna/",
            icon: "instagram",
            label: "Insta",
            brand: "#e1306c",
        },
    },
    // Collections. Each one is a booster pack, a run of pages in the binder and, once its
    // booster is opened, a part of the deck: the deck holds every opened set, in this order.
    // A new collection only needs an entry here:
    //   id       stable key, also stored in localStorage once the booster is opened, and the
    //            URL hash that opens the deck on this set alone (antoine.kim/#after-hours)
    //   code     two letters, printed on the pack and before each collector number (BS 01/05)
    //   name     shown on the pack, the deck dividers and the binder
    //   tagline  what is inside, under the pack while picking one
    //   icon     key of icons.js, shown on the deck dividers and the binder tabs
    //   secret   left out of sight until every other card has been seen (collection.js)
    //   booster  colours of the pack: `color` for the wrapper, `highlight` for its accents
    //   cards    full card data (see the README), or `projects`, printed by setCards()
    // Any card or project can take a `rarity` (see RARITIES). A card's corner stat
    // (header.hpLabel and hpValue, or an hpType computed in tcg-card.js) is a figure: years,
    // roles, apps, a level; a set without one for each card leaves the corner empty, as Off
    // the Clock does (the collector number is in the footer already). The texts are in
    // English here; public/js/locales/fr.js translates them, by set id and card slug.
    SETS: [
        {
            id: "base",
            code: "BS",
            name: "Base Set",
            tagline: "Profile & contact",
            icon: "star",
            booster: { color: "#f0532b", highlight: "#ffd77a" },
            cards: [
                {
                    id: 1,
                    // URL hash that opens the deck on this card, e.g. antoine.kim/#profile
                    slug: "profile",
                    theme: "fire",
                    rarity: "gold",
                    header: {
                        stage: "Professional Profile",
                        name: "Antoine Kim",
                        hpLabel: "EXP",
                        hpType: "dynamic-exp",
                    },
                    image: "public/img/ak.jpg",
                    body: {
                        row1: {
                            title: "Engineering Manager",
                            desc: "Technical leadership and team management. Orchestrating complex projects with a strong focus on code quality.",
                            icon: "star",
                        },
                        row2: {
                            title: "Contact Me",
                            desc: "",
                            actions: ["linkedin", "email"],
                        },
                    },
                    footer: {
                        text: "Status: Open to offers",
                    },
                    // Optional verso, shown when the card is flipped.
                    back: {
                        title: "Quick Facts",
                        items: [
                            { label: "Role", text: "Engineering Manager" },
                            { label: "Coding since", text: "2011" },
                            { label: "Based in", text: "Nantes, France" },
                            { label: "Speaks", text: "French, English" },
                            { label: "Status", text: "Open to offers" },
                            { label: "Contact", text: "contact@antoine.kim" },
                        ],
                    },
                },
                {
                    id: 2,
                    slug: "stack",
                    theme: "psychic",
                    rarity: "rare",
                    header: {
                        stage: "Core Competencies",
                        name: "Tech Stack",
                        hpLabel: "LVL",
                        hpValue: "99",
                    },
                    image: "public/img/tech-stack.jpg",
                    body: {
                        row1: {
                            title: "Technical Leadership",
                            desc: "Leading and managing development teams. Expert in PHP, Python and building scalable architectures.",
                            icon: "users",
                        },
                        row2: {
                            title: "Full Stack & DevOps",
                            desc: "Backend expertise, CI/CD pipelines, team mentoring and agile project delivery.",
                            actions: ["linkedin", "github"],
                        },
                    },
                    footer: {
                        text: "Team: Dev Manager",
                    },
                    back: {
                        title: "Stack",
                        items: [
                            { label: "Backend", text: "PHP, Python" },
                            { label: "Architecture", text: "Scalable backend systems" },
                            { label: "Delivery", text: "CI/CD pipelines, DevOps" },
                            { label: "Leadership", text: "Team management, mentoring, agile delivery" },
                            { label: "After hours", text: "JavaScript, TypeScript, Vue" },
                        ],
                    },
                },
                {
                    id: 3,
                    slug: "experience",
                    theme: "ice",
                    header: {
                        stage: "Career",
                        name: "Experience",
                        hpLabel: "ROLES",
                        hpValue: "5",
                    },
                    image: "public/img/experience.jpg",
                    body: {
                        row1: {
                            title: "How I Got Here",
                            desc: "Fifteen years writing code across the stack, then leading the teams doing it. Still in the pull requests.",
                            icon: "layer-group",
                        },
                        row2: {
                            title: "Full Timeline",
                            desc: "Flip the card for the roles, year by year. Every detail on LinkedIn.",
                            actions: ["linkedin"],
                        },
                    },
                    footer: {
                        text: "Base: Nantes",
                    },
                    // The tech roles, most recent first (from the LinkedIn profile).
                    back: {
                        title: "Timeline",
                        items: [
                            { label: "2026 – now · Engineering Manager", text: "Recommerce. Gen AI across the dev cycle." },
                            { label: "2024 – 2026 · Lead Dev Manager", text: "Recommerce. AI-assisted DX, AWS." },
                            { label: "2020 – 2024 · Lead Developer", text: "Recommerce. Team of 8, Symfony APIs." },
                            { label: "2017 – 2020 · Backend Developer", text: "Recommerce. Symfony, Zend, AWS Lambda." },
                            { label: "2014 – 2017 · Full-stack Developer", text: "Groupe Zéphir. Java, PHP, Vue.js." },
                            { label: "2011 – 2013 · Web Developer", text: "Internships. PHP, MySQL, Drupal." },
                        ],
                    },
                },
                {
                    id: 4,
                    slug: "projects",
                    theme: "dark",
                    header: {
                        stage: "Side Projects",
                        name: "Projects",
                        hpLabel: "APPS",
                        hpValue: "7",
                    },
                    image: "public/img/projects/projects.jpg",
                    body: {
                        row1: {
                            title: "Built After Hours",
                            desc: "Small tools I actually use, shipped on the side. Each one has its own card in the After Hours expansion.",
                            icon: "star",
                        },
                        row2: {
                            title: "Explore",
                            desc: "",
                            // Opens this expansion's page in the binder.
                            expansion: "after-hours",
                            actions: ["github"],
                        },
                    },
                    footer: {
                        text: "License: MIT",
                    },
                    back: {
                        title: "After Hours",
                        items: [
                            { label: "Map2Poster", text: "Any city as a print-ready poster" },
                            { label: "Kimpay", text: "Group expenses, to the cent" },
                            { label: "MixEra", text: "A music quiz: guess the year" },
                            { label: "Naolib", text: "Nantes transit in Home Assistant" },
                            { label: "EzLoc", text: "Holiday rental site with its own CMS" },
                            { label: "Cookim", text: "Recipes, meal plans, shopping lists" },
                            { label: "TCG Portfolio", text: "The site you are on" },
                        ],
                    },
                },
                {
                    id: 5,
                    slug: "about",
                    theme: "grass",
                    header: {
                        stage: "Personal",
                        name: "About Me",
                        hpLabel: "AGE",
                        hpType: "dynamic-age",
                    },
                    image: "public/img/elephant.jpg",
                    body: {
                        row1: {
                            title: "Interests",
                            desc: "Passionate about Cycling, Photography & Cinema. Inspired by Nantes' unique blend of art and industry.",
                            icon: "heart",
                        },
                        row2: {
                            title: "Creative Side",
                            desc: "Sharing moments through the lens, on two wheels.",
                            // Opens this expansion's page in the binder.
                            expansion: "off-the-clock",
                            actions: ["twitter", "instagram"],
                        },
                    },
                    footer: {
                        text: "Speaks: FR / EN",
                    },
                    back: {
                        title: "Off the Clock",
                        items: [
                            { label: "Rides", text: "Cycling, bikepacking" },
                            { label: "Shoots", text: "Photography" },
                            { label: "Watches", text: "Cinema" },
                            { label: "Home", text: "Nantes, art and industry" },
                            { label: "Speaks", text: "French, English" },
                        ],
                    },
                },
            ],
        },
        {
            id: "after-hours",
            code: "AH",
            name: "After Hours",
            tagline: "Side projects",
            icon: "moon",
            booster: { color: "#1d1757", highlight: "#8ff0ff" },
            // Side projects, each printed as a card with its live demo and source links, and
            // `image` in the picture frame (`icon` fills it when there is none). `year`, when
            // it started (its repository's creation), takes the corner stat: SINCE 2025.
            // `slug` is the URL hash that opens the deck on that card, as for `cards`.
            projects: {
                map2poster: {
                    slug: "map2poster",
                    year: 2018,
                    label: "Map2Poster",
                    icon: "map-location-dot",
                    image: "public/img/projects/map2poster.jpg",
                    desc: "Any city as a print-ready poster",
                    about: "Ten poster styles, exported at 300 DPI for an A1 print. Runs in the browser, no account, no API key.",
                    language: "HTML",
                    demo: "https://dim4k.github.io/map2poster/",
                    source: "https://github.com/dim4k/map2poster",
                    brand: "#2d6a4f",
                },
                kimpay: {
                    slug: "kimpay",
                    year: 2025,
                    label: "Kimpay",
                    icon: "wallet",
                    image: "public/img/projects/kimpay.jpg",
                    desc: "Group expenses, to the cent",
                    about: "No account, just a shared link: everyone adds what they paid, and it works out who owes whom in the fewest payments.",
                    language: "TypeScript",
                    demo: "https://kimpay.io/",
                    source: "https://github.com/dim4k/kimpay",
                    brand: "#4f46e5",
                    rarity: "gold",
                },
                mixera: {
                    slug: "mixera",
                    year: 2026,
                    label: "MixEra",
                    icon: "music",
                    image: "public/img/projects/mixera.jpg",
                    desc: "A music quiz: guess the year",
                    about: "Five game modes, from the exact year of a song to a blind test. Plays with physical Hitster cards too.",
                    language: "Vue",
                    demo: "https://dim4k.github.io/mixera/",
                    source: "https://github.com/dim4k/mixera",
                    brand: "#42b883",
                },
                haNaolib: {
                    slug: "naolib",
                    year: 2025,
                    label: "Naolib",
                    icon: "bus",
                    image: "public/img/projects/naolib.jpg",
                    desc: "Nantes transit in Home Assistant",
                    about: "Real-time bus, tram and ferry departures on the Naolib network, and the bikes left at each station.",
                    language: "JavaScript",
                    source: "https://github.com/dim4k/ha-naolib",
                    brand: "#41bdf5",
                },
                ezloc: {
                    slug: "ezloc",
                    year: 2025,
                    label: "EzLoc",
                    icon: "house",
                    image: "public/img/projects/ezloc.jpg",
                    desc: "Holiday rental site with its own CMS",
                    about: "A showcase site for a holiday home: texts, photos, prices and SEO all edited in a self-hosted PocketBase.",
                    language: "JavaScript",
                    source: "https://github.com/dim4k/ezloc",
                    brand: "#0d9488",
                    rarity: "rare",
                },
                cookim: {
                    slug: "cookim",
                    year: 2026,
                    label: "Cookim",
                    icon: "utensils",
                    image: "public/img/projects/cookim.jpg",
                    desc: "Recipes, meal plans, shopping lists",
                    about: "My recipes in one place, a weekend or a week of meals planned, and the shopping list already merged.",
                    // Private repository: no source link, and no language on the card.
                    demo: "https://coo.kim/",
                    brand: "#e8552d",
                    rarity: "rare",
                },
                tcgPortfolio: {
                    slug: "tcg-portfolio",
                    year: 2025,
                    label: "TCG Portfolio",
                    icon: "layer-group",
                    image: "public/img/projects/tcg-portfolio.jpg",
                    desc: "The site you are on",
                    about: "Boosters, holo foil and card physics in vanilla JS, without a build step.",
                    language: "JavaScript",
                    demo: "https://antoine.kim/",
                    source: "https://github.com/dim4k/tcg-portfolio",
                    brand: "#7c3aed",
                },
            },
        },
        {
            id: "off-the-clock",
            code: "OC",
            name: "Off the Clock",
            tagline: "Life outside work",
            icon: "camera",
            booster: { color: "#0f4c46", highlight: "#ffb05c" },
            // Life outside work.
            cards: [
                {
                    id: 1,
                    slug: "cycling",
                    theme: "grass",
                    rarity: "gold",
                    header: { stage: "Off the Clock", name: "Cycling" },
                    image: "public/img/off-the-clock/cycling.jpg",
                    body: {
                        row1: {
                            title: "Bikepacking",
                            desc: "Bags strapped to the bike and a few days on the road, from Nantes to wherever it leads.",
                            icon: "bicycle",
                        },
                        row2: {
                            title: "Ride Along",
                            desc: "Rides, and the stops along the way.",
                            actions: ["instagram"],
                        },
                    },
                    footer: { text: "Base: Nantes" },
                },
                {
                    id: 2,
                    slug: "photography",
                    theme: "electric",
                    rarity: "rare",
                    header: { stage: "Off the Clock", name: "Photography" },
                    image: "public/img/off-the-clock/photography.jpg",
                    body: {
                        row1: {
                            title: "Through the Lens",
                            desc: "Moments caught along the way, on the road or around town.",
                            icon: "camera",
                        },
                        row2: {
                            title: "See the Shots",
                            desc: "",
                            actions: ["instagram"],
                        },
                    },
                    footer: { text: "Shared on Instagram" },
                },
                {
                    id: 3,
                    slug: "cinema",
                    theme: "psychic",
                    header: { stage: "Off the Clock", name: "Cinema" },
                    image: "public/img/off-the-clock/cinema.jpg",
                    body: {
                        row1: {
                            title: "The Big Screen",
                            desc: "A dark room, a big screen, and a story that stays with you after the credits.",
                            icon: "film",
                        },
                        row2: {
                            title: "Talk Films",
                            desc: "Always up for a recommendation, given or taken.",
                            actions: ["twitter"],
                        },
                    },
                    footer: { text: "Off the Clock" },
                },
                {
                    id: 4,
                    slug: "nantes",
                    theme: "ice",
                    header: { stage: "Off the Clock", name: "Nantes" },
                    image: "public/img/elephant.jpg",
                    body: {
                        row1: {
                            title: "Art & Industry",
                            desc: "Old shipyards turned into playgrounds, and a mechanical elephant walking the Île de Nantes.",
                            icon: "map-location-dot",
                        },
                        row2: {
                            title: "Home Base",
                            desc: "Where I live, work and ride.",
                        },
                    },
                    footer: { text: "Base: Nantes" },
                },
                {
                    id: 5,
                    slug: "follow",
                    theme: "fire",
                    header: { stage: "Off the Clock", name: "Follow Along" },
                    image: "public/img/off-the-clock/follow.jpg",
                    body: {
                        row1: {
                            title: "Rides, Shots & Films",
                            desc: "What I get up to off the clock, shared as it happens.",
                            icon: "heart",
                        },
                        row2: {
                            title: "Find Me",
                            desc: "",
                            actions: ["twitter", "instagram"],
                        },
                    },
                    footer: { text: "Speaks: FR / EN" },
                },
            ],
        },
        {
            // The reward for seeing every card: its booster shows up in the dock then.
            id: "secret",
            code: "SR",
            name: "Secret",
            tagline: "Every card seen",
            icon: "envelope",
            secret: true,
            booster: { color: "#16131f", highlight: "#e6dcff" },
            cards: [
                {
                    id: 1,
                    slug: "lets-talk",
                    theme: "dark",
                    rarity: "secret",
                    header: {
                        stage: "Secret Rare",
                        name: "Let's Talk",
                        hpLabel: "CARDS",
                        hpType: "collection-count",
                    },
                    art: { icon: "envelope" },
                    body: {
                        row1: {
                            title: "You've Seen Them All",
                            desc: "Every card turned up. If you made it this far, we should probably talk.",
                            icon: "envelope",
                        },
                        row2: {
                            title: "Get in Touch",
                            desc: "",
                            actions: ["email", "linkedin"],
                        },
                    },
                    footer: { text: "Status: Open to offers" },
                    back: {
                        title: "Next Move",
                        items: [
                            { label: "Email", text: "contact@antoine.kim" },
                            { label: "LinkedIn", text: "in/antoine-kim" },
                            { label: "Based in", text: "Nantes, France" },
                            { label: "Status", text: "Open to offers" },
                            { label: "Collection", text: "Complete. Well played." },
                        ],
                    },
                },
            ],
        },
    ],
};
