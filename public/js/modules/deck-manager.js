import { CONFIG } from "../config.js";
import { Utils } from "./utils.js";
import { SwirlBackground } from "./swirl-background.js";

export class DeckManager {
    constructor() {
        this.isAnimating = false;
        this.isGridView = false;
        this.swirlBackground = null;
        this.body = document.body;
        this.cards = [];
        this.deckContainer = document.getElementById("deck");
        this.toggleBtn = document.getElementById("view-toggle-btn");

        // Listen for theme changes from cards
        document.addEventListener("theme-change", (e) => {
            const card = e.target;
            // Only update background if the event comes from the active card
            if (card.dataset.pos === "0" && !this.isGridView) {
                this.updateBackground(e.detail.theme);
            }
        });
    }

    init() {
        this.cards = Array.from(document.querySelectorAll("tcg-card"));
        this.updatePositions();
        this.initSwirlBackground();

        if (this.toggleBtn) {
            this.toggleBtn.addEventListener("click", () => this.toggleView());
        }
    }

    toggleView() {
        this.isGridView = !this.isGridView;
        const state = this.isGridView
            ? CONFIG.VIEW_TOGGLE.grid
            : CONFIG.VIEW_TOGGLE.deck;

        this.deckContainer.classList.toggle("grid-view", this.isGridView);
        this.body.classList.toggle("grid-active", this.isGridView);
        this.toggleBtn.innerHTML = `<i class="${state.icon}"></i> <span>${state.label}</span>`;

        // Pause the animated background while browsing the grid, resume otherwise.
        if (this.swirlBackground) {
            if (this.isGridView) {
                this.swirlBackground.disable();
            } else {
                this.swirlBackground.enable();
            }
        }

        this.cards.forEach((card) => {
            card.classList.toggle("grid-mode", this.isGridView);
            if (this.isGridView) card.style.transform = "";
        });

        if (!this.isGridView) this.updatePositions();
    }

    getCards() {
        return this.cards;
    }

    updatePositions() {
        if (this.isGridView) return;

        this.cards.forEach((card, index) => {
            card.dataset.pos = index;
            card.classList.remove("slide-out");
            card.style.transform = "";
        });

        const activeCard = this.cards[0];
        if (activeCard) {
            const themeName = activeCard.getAttribute("theme") || "default";
            this.updateBackground(themeName);
        }
    }

    updateBackground(themeName) {
        const themeColor =
            CONFIG.THEME_COLORS[themeName] || CONFIG.THEME_COLORS.default;
        this.body.style.backgroundColor = themeColor;

        if (this.swirlBackground && !Utils.isMobile()) {
            this.swirlBackground.setTheme(themeName);
        }
    }

    rotateCards() {
        if (this.isAnimating || this.isGridView) return;

        const topCard = this.cards[0];
        if (!topCard) return;

        this.isAnimating = true;
        topCard.classList.add("slide-out");

        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            topCard.removeEventListener("transitionend", onEnd);
            clearTimeout(fallback);

            // Rotate the array instead of moving DOM elements
            this.cards.push(this.cards.shift());
            topCard.classList.remove("slide-out");
            this.updatePositions();

            setTimeout(() => {
                this.isAnimating = false;
            }, CONFIG.ANIMATION_BUFFER);
        };

        const onEnd = (e) => {
            if (e.target === topCard && e.propertyName === "transform") {
                finish();
            }
        };
        topCard.addEventListener("transitionend", onEnd);

        // Safety net in case the transition is skipped or interrupted.
        const fallback = setTimeout(
            finish,
            CONFIG.ANIMATION_DELAY + CONFIG.ANIMATION_BUFFER
        );
    }

    initSwirlBackground() {
        if (!Utils.isMobile() && !Utils.prefersReducedMotion()) {
            this.swirlBackground = new SwirlBackground("canvas-background");

            const cards = this.getCards();
            const activeCard = cards[0];
            let initialTheme = "default";

            if (activeCard) {
                initialTheme = activeCard.getAttribute("theme") || "default";
            }

            this.swirlBackground.setTheme(initialTheme);
        }
    }
}
