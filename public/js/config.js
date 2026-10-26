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
    // sessionStorage key: ids of the sets opened this session, comma separated, i.e. the sets
    // in the deck. The booster intro plays only while it is empty. Mirrored in index.html.
    BOOSTER_KEY: "tcg-booster-opened",
    // Label/icon for the deck<->binder view toggle button, keyed by current view.
    VIEW_TOGGLE: {
        deck: { icon: "book-open", label: "Binder" },
        binder: { icon: "layer-group", label: "Deck" },
    },
    // Card rarities, in rising order. A card gets one with `rarity: "rare"` or `rarity: "gold"`;
    // without it, it is common. Each rarity has its own finish (tcg-card.css), a symbol before
    // the collector number, and its reveal in the booster, where it comes out after the
    // commons: the halo for a rare, the back cracking open for a gold.
    RARITIES: {
        rare: { label: "Rare", symbol: "★", reveal: "halo" },
        gold: { label: "Gold", symbol: "★★", reveal: "cracks" },
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
    //   id       stable key, also stored in sessionStorage once the booster is opened
    //   code     two letters, printed on the pack and before each collector number (BS 01/05)
    //   name     shown on the pack, the deck dividers and the binder
    //   icon     key of icons.js, shown on the deck dividers and the binder tabs
    //   booster  colours of the pack: `color` for the wrapper, `highlight` for its accents
    //   cards    full card data (see the README), or `projects`, printed by setCards()
    // Any card or project can take a `rarity` (see RARITIES).
    SETS: [
        {
            id: "base",
            code: "BS",
            name: "Base Set",
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
                        hpValue: "Exp",
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
                            { label: "Map2Poster", text: "Print-ready map posters" },
                            { label: "Kimpay", text: "Split expenses with friends" },
                            { label: "MixEra", text: "Guess the year of a song" },
                            { label: "Naolib", text: "Live transit in Home Assistant" },
                            { label: "EzLoc", text: "Rental site with a built-in CMS" },
                            { label: "Cookim", text: "Recipes, meal plans and shopping lists" },
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
            icon: "moon",
            booster: { color: "#1d1757", highlight: "#8ff0ff" },
            // Side projects, each printed as a card with its live demo and source links, and
            // `image` in the picture frame (`icon` fills it when there is none).
            // `slug` is the URL hash that opens the deck on that card, as for `cards`.
            projects: {
                map2poster: {
                    slug: "map2poster",
                    label: "Map2Poster",
                    icon: "map-location-dot",
                    image: "public/img/projects/map2poster.jpg",
                    desc: "Print-ready map posters",
                    about: "Generates a high resolution image of a map, styled with Mapbox.",
                    language: "HTML",
                    demo: "https://dim4k.github.io/map2poster/",
                    source: "https://github.com/dim4k/map2poster",
                    brand: "#2d6a4f",
                },
                kimpay: {
                    slug: "kimpay",
                    label: "Kimpay",
                    icon: "wallet",
                    image: "public/img/projects/kimpay.jpg",
                    desc: "Split expenses with friends",
                    language: "TypeScript",
                    demo: "https://kimpay.io/",
                    source: "https://github.com/dim4k/kimpay",
                    brand: "#4f46e5",
                    rarity: "gold",
                },
                mixera: {
                    slug: "mixera",
                    label: "MixEra",
                    icon: "music",
                    image: "public/img/projects/mixera.jpg",
                    desc: "Guess the year of a song",
                    language: "Vue",
                    demo: "https://dim4k.github.io/mixera/",
                    source: "https://github.com/dim4k/mixera",
                    brand: "#42b883",
                },
                haNaolib: {
                    slug: "naolib",
                    label: "Naolib",
                    icon: "bus",
                    image: "public/img/projects/naolib.jpg",
                    desc: "Live transit in Home Assistant",
                    about: "Home Assistant integration for the Naolib bus and tram network in Nantes.",
                    language: "JavaScript",
                    source: "https://github.com/dim4k/ha-naolib",
                    brand: "#41bdf5",
                },
                ezloc: {
                    slug: "ezloc",
                    label: "EzLoc",
                    icon: "house",
                    image: "public/img/projects/ezloc.jpg",
                    desc: "Rental site with a built-in CMS",
                    language: "JavaScript",
                    source: "https://github.com/dim4k/ezloc",
                    brand: "#0d9488",
                    rarity: "rare",
                },
                cookim: {
                    slug: "cookim",
                    label: "Cookim",
                    icon: "utensils",
                    image: "public/img/projects/cookim.jpg",
                    desc: "Recipes, meal plans and shopping lists",
                    about: "My recipes in one place, planned through the week and turned into a shopping list.",
                    // Private repository: no source link, and no language on the card.
                    demo: "https://coo.kim/",
                    brand: "#e8552d",
                    rarity: "rare",
                },
                tcgPortfolio: {
                    slug: "tcg-portfolio",
                    label: "TCG Portfolio",
                    icon: "layer-group",
                    image: "public/img/projects/tcg-portfolio.jpg",
                    desc: "The site you are on",
                    about: "Holo foil, 3D tilt and card physics in vanilla JS, without a build step.",
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
            icon: "camera",
            booster: { color: "#0f4c46", highlight: "#ffb05c" },
            // Life outside work.
            cards: [
                {
                    id: 1,
                    slug: "cycling",
                    theme: "grass",
                    rarity: "gold",
                    header: { stage: "Off the Clock", name: "Cycling", hpLabel: "NO.", hpValue: "01" },
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
                    header: { stage: "Off the Clock", name: "Photography", hpLabel: "NO.", hpValue: "02" },
                    image: "public/img/off-the-clock/photography.jpg",
                    body: {
                        row1: {
                            title: "Through the Lens",
                            desc: "Sharing moments through the lens, on two wheels.",
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
                    header: { stage: "Off the Clock", name: "Cinema", hpLabel: "NO.", hpValue: "03" },
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
                    header: { stage: "Off the Clock", name: "Nantes", hpLabel: "NO.", hpValue: "04" },
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
                    header: { stage: "Off the Clock", name: "Follow Along", hpLabel: "NO.", hpValue: "05" },
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
    ],
};
