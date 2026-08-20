// Global Configuration
export const CONFIG = {
    BIRTH_DATE: "1988-05-01",
    CAREER_START_DATE: "2011-05-01",
    // Keep in sync with the 600px media queries in responsive.css and tcg-card.css.
    MOBILE_BREAKPOINT: 600,
    SWIPE_THRESHOLD: 20,
    // Must match the .slide-out transition duration in tcg-card.css (0.4s).
    ANIMATION_DELAY: 400,
    ANIMATION_BUFFER: 100,
    // Deepest rank still drawn in the stack; anything further back is hidden.
    MAX_STACK_DEPTH: 2,
    // One trackpad flick emits dozens of events; one mouse notch is ~100.
    WHEEL_THRESHOLD: 50,
    HINT_INITIAL_DELAY: 5000,
    HINT_REPEAT_INTERVAL: 5000,
    HINT_MAX_REPEATS: 3,
    GYRO_SENSITIVITY: 0.5,
    GYRO_MAX_ROTATION: 15,
    MOUSE_ROTATION_FACTOR: 10,
    // Tilt applied to the hovered card. The deck's own perspective lives in base.css.
    TILT_PERSPECTIVE: 1000,
    TILT_SCALE: 1.02,
    GLARE_MOUSE: 1,
    GLARE_GYRO: 0.8,
    // Selectable themes (single source of truth for the card theme switcher)
    THEMES: [
        { id: "dark", label: "Dark", icon: "circle" },
        { id: "ice", label: "Ice", icon: "snowflake" },
        { id: "fire", label: "Fire", icon: "fire" },
        { id: "electric", label: "Electric", icon: "bolt" },
        { id: "psychic", label: "Psychic", icon: "moon" },
        { id: "grass", label: "Grass", icon: "leaf" },
    ],
    // Label/icon for the deck<->grid view toggle button, keyed by current view.
    VIEW_TOGGLE: {
        deck: { icon: "th-large", label: "Grid View" },
        grid: { icon: "layer-group", label: "Deck View" },
    },
    SOCIAL: {
        linkedin: {
            url: "https://www.linkedin.com/in/antoine-kim/",
            icon: "linkedin",
            label: "LinkedIn",
            class: "linkedin",
        },
        email: {
            url: "mailto:contact@antoine.kim",
            icon: "envelope",
            label: "Email",
            class: "email",
        },
        github: {
            url: "https://github.com/dim4k",
            icon: "github",
            label: "GitHub",
            class: "github",
        },
        twitter: {
            url: "https://x.com/AntoineKim_",
            icon: "twitter",
            label: "Twitter",
            class: "twitter",
        },
        instagram: {
            url: "https://www.instagram.com/mikotna/",
            icon: "instagram",
            label: "Insta",
            class: "instagram",
        },
    },
    // Side projects rendered as a link list; url points at the live demo when there is one.
    PROJECTS: {
        map2poster: {
            url: "https://dim4k.github.io/map2poster/",
            icon: "map-location-dot",
            label: "Map2Poster",
            desc: "Print-ready map posters",
            class: "map2poster",
        },
        kimpay: {
            url: "https://kimpay.io/",
            icon: "wallet",
            label: "Kimpay",
            desc: "Split expenses with friends",
            class: "kimpay",
        },
        mixera: {
            url: "https://dim4k.github.io/mixera/",
            icon: "music",
            label: "MixEra",
            desc: "Guess the year of a song",
            class: "mixera",
        },
        haNaolib: {
            url: "https://github.com/dim4k/ha-naolib",
            icon: "bus",
            label: "Naolib",
            desc: "Live transit in Home Assistant",
            class: "ha-naolib",
        },
        ezloc: {
            url: "https://github.com/dim4k/ezloc",
            icon: "house",
            label: "EzLoc",
            desc: "Rental site with a built-in CMS",
            class: "ezloc",
        },
        tcgPortfolio: {
            url: "https://github.com/dim4k/tcg-portfolio",
            icon: "layer-group",
            label: "TCG Portfolio",
            desc: "The site you are on",
            class: "tcg-portfolio",
        },
        github: {
            url: "https://github.com/dim4k",
            icon: "github",
            label: "More on GitHub",
            desc: "Everything else I have pushed",
            class: "github",
        },
    },
    CARDS: [
        {
            id: 1,
            theme: "fire",
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
        },
        {
            id: 2,
            theme: "psychic",
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
        },
        {
            id: 3,
            theme: "ice",
            header: {
                stage: "Career",
                name: "Experience",
                hpLabel: "ROLES",
                hpValue: "4",
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
                    desc: "Roles, companies and projects, year by year.",
                    actions: ["linkedin"],
                },
            },
            footer: {
                text: "Base: Nantes",
            },
        },
        {
            id: 4,
            theme: "dark",
            header: {
                stage: "Side Projects",
                name: "Projects",
                hpLabel: "REPOS",
                hpValue: "6",
            },
            body: {
                row1: {
                    title: "Built After Hours",
                    desc: "Small tools I actually use, shipped on the side.",
                    icon: "star",
                },
                row2: {
                    title: "Explore",
                    projects: [
                        "map2poster",
                        "kimpay",
                        "mixera",
                        "haNaolib",
                        "ezloc",
                        "tcgPortfolio",
                        "github",
                    ],
                },
            },
            footer: {
                text: "License: MIT",
            },
        },
        {
            id: 5,
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
                    desc: "Sharing moments through the lens on two wheels,",
                    actions: ["twitter", "instagram"],
                },
            },
            footer: {
                text: "Lang: FR / EN",
            },
        },
    ],
};
