// Global Configuration
window.CONFIG = {
    BIRTH_DATE: "1988-05-01",
    CAREER_START_DATE: "2011-05-01",
    MOBILE_BREAKPOINT: 600,
    SWIPE_THRESHOLD: 20,
    ANIMATION_DELAY: 300,
    ANIMATION_BUFFER: 100,
    HINT_INITIAL_DELAY: 5000,
    HINT_REPEAT_INTERVAL: 5000,
    HINT_DURATION: 3000,
    GYRO_SENSITIVITY: 0.5,
    GYRO_MAX_ROTATION: 15,
    MOUSE_ROTATION_FACTOR: 10,
    THEME_COLORS: {
        dark: "#0a0a0a",
        fire: "#4a0000",
        electric: "#5e4b00",
        psychic: "#2a004a",
        grass: "#0d3d1f",
        ice: "#0a3d52",
        default: "#101010",
    },
    SOCIAL: {
        linkedin: {
            url: "https://www.linkedin.com/in/antoine-kim/",
            icon: "fab fa-linkedin",
            label: "LinkedIn",
            class: "linkedin",
        },
        email: {
            url: "mailto:contact@antoine.kim",
            icon: "fas fa-envelope",
            label: "Email",
            class: "email",
        },
        github: {
            url: "https://github.com/dim4k",
            icon: "fab fa-github",
            label: "GitHub",
            class: "github",
        },
        twitter: {
            url: "https://x.com/AntoineKim_",
            icon: "fab fa-twitter",
            label: "Twitter",
            class: "twitter",
        },
        instagram: {
            url: "https://www.instagram.com/mikotna/",
            icon: "fab fa-instagram",
            label: "Insta",
            class: "instagram",
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
                    title: "Lead Developer",
                    desc: "Technical leadership and team management. Orchestrating complex projects with a strong focus on code quality.",
                    icon: "fas fa-star",
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
                    icon: "fas fa-users",
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
                    icon: "fas fa-heart",
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
