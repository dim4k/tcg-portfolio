window.TCG = window.TCG || {};

window.TCG.DeckManager = class DeckManager {
    constructor() {
        this.isAnimating = false;
        this.swirlBackground = null;
        this.body = document.body;
        this.cards = [];

        // Listen for theme changes from cards
        document.addEventListener("theme-change", (e) => {
            const card = e.target;
            // Only update background if the event comes from the active card
            if (card.dataset.pos === "0") {
                this.updateBackground(e.detail.theme);
            }
        });
    }

    init() {
        this.cards = Array.from(document.querySelectorAll("tcg-card"));
        this.updatePositions();
        this.initSwirlBackground();
    }

    getCards() {
        return this.cards;
    }

    updatePositions() {
        this.cards.forEach((card, index) => {
            card.dataset.pos = index;
            card.classList.remove("slide-out", "re-enter");
            card.style.transform = "";
        });

        const activeCard = this.cards[0];
        if (activeCard) {
            const themeName = activeCard.getAttribute("theme") || "default";
            this.updateBackground(themeName);
        }
    }

    updateBackground(themeName) {
        const CONFIG = window.CONFIG;
        const themeColor =
            CONFIG.THEME_COLORS[themeName] || CONFIG.THEME_COLORS.default;
        this.body.style.backgroundColor = themeColor;

        if (
            this.swirlBackground &&
            !window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`)
                .matches
        ) {
            this.swirlBackground.setTheme(themeName);
        }
    }

    rotateCards() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        const CONFIG = window.CONFIG;

        const topCard = this.cards[0];

        if (!topCard) return;

        topCard.classList.add("slide-out");

        setTimeout(() => {
            // Rotate the array instead of moving DOM elements
            this.cards.push(this.cards.shift());

            topCard.classList.remove("slide-out");

            this.updatePositions();

            setTimeout(() => {
                this.isAnimating = false;
            }, CONFIG.ANIMATION_BUFFER);
        }, CONFIG.ANIMATION_DELAY);
    }

    initSwirlBackground() {
        const CONFIG = window.CONFIG;
        if (
            !window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`)
                .matches
        ) {
            this.swirlBackground = new window.TCG.SwirlBackground(
                "canvas-background"
            );

            const cards = this.getCards();
            const activeCard = cards[0];
            let initialTheme = "default";

            if (activeCard) {
                initialTheme = activeCard.getAttribute("theme") || "default";
            }

            this.swirlBackground.setTheme(initialTheme);
        }
    }
};
