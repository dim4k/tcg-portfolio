import { CONFIG } from "../config.js";
import { Utils } from "./utils.js";
import { icon } from "./icons.js";
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
        this.syncBackground();

        if (this.toggleBtn) {
            this.toggleBtn.addEventListener("click", () => this.toggleView());
        }

        // Rotating a phone or resizing across the breakpoint must re-evaluate the background.
        Utils.mobileMql.addEventListener("change", () => this.syncBackground());
        Utils.reducedMotionMql.addEventListener("change", () =>
            this.syncBackground()
        );
    }

    toggleView() {
        if (!this.deckContainer || !this.toggleBtn) return;

        this.isGridView = !this.isGridView;
        const state = this.isGridView
            ? CONFIG.VIEW_TOGGLE.grid
            : CONFIG.VIEW_TOGGLE.deck;

        this.deckContainer.classList.toggle("grid-view", this.isGridView);
        this.body.classList.toggle("grid-active", this.isGridView);
        this.toggleBtn.querySelector("svg")?.replaceWith(icon(state.icon));
        this.toggleBtn.querySelector("span").textContent = state.label;
        this.toggleBtn.setAttribute("aria-pressed", String(this.isGridView));

        this.syncBackground();

        this.cards.forEach((card) => {
            card.classList.toggle("grid-mode", this.isGridView);
            if (this.isGridView) card.style.transform = "";
        });

        if (!this.isGridView) this.updatePositions();
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

        if (this.swirlBackground) {
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

    // Single decision point for whether the animated background should be running.
    syncBackground() {
        const wanted =
            !this.isGridView &&
            !Utils.isMobile() &&
            !Utils.prefersReducedMotion();

        if (wanted && !this.swirlBackground) {
            this.swirlBackground = SwirlBackground.create("canvas-background");
            const activeCard = this.cards[0];
            this.swirlBackground?.setTheme(
                activeCard?.getAttribute("theme") || "default"
            );
        }

        if (!this.swirlBackground) return;

        if (wanted) this.swirlBackground.enable();
        else this.swirlBackground.disable();
    }
}
