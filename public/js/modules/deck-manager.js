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

    updatePositions(keepSlideOut = null) {
        if (this.isGridView) return;

        this.cards.forEach((card, index) => {
            card.dataset.pos = index;
            card.style.transform = "";
            if (card !== keepSlideOut) card.classList.remove("slide-out");
        });

        const activeCard = this.cards[0];
        if (activeCard) {
            const themeName = activeCard.getAttribute("theme") || "default";
            this.updateBackground(themeName);
        }
    }

    updateBackground(themeName) {
        // Colours live in :root so CSS and JS cannot drift apart.
        const root = document.documentElement;
        const styles = getComputedStyle(root);
        const themeColor =
            styles.getPropertyValue(`--bg-${themeName}`).trim() ||
            styles.getPropertyValue("--bg-default").trim();

        this.body.style.backgroundColor = themeColor;

        if (this.swirlBackground) {
            this.swirlBackground.setTheme(themeName);
        }
    }

    /**
     * @param {number} direction 1 sends the front card to the back, -1 brings the back one forward.
     */
    rotateCards(direction = 1) {
        if (this.isAnimating || this.isGridView) return;
        if (this.cards.length < 2) return;

        this.isAnimating = true;

        if (direction < 0) this.rotateBackward();
        else this.rotateForward();
    }

    rotateForward() {
        const outgoing = this.cards[0];
        outgoing.classList.add("slide-out");

        this.whenSettled(outgoing, () => {
            // Rotate the array instead of moving DOM elements
            this.cards.push(this.cards.shift());
            this.updatePositions();
        });
    }

    rotateBackward() {
        const incoming = this.cards[this.cards.length - 1];

        // Park it where the forward animation ends, without animating, then release it:
        // the entry is the exit played backwards.
        incoming.classList.add("no-transition", "slide-out");
        void incoming.offsetWidth;

        this.cards.unshift(this.cards.pop());
        this.updatePositions(incoming);
        void incoming.offsetWidth;

        incoming.classList.remove("no-transition");
        incoming.classList.add("slide-in");
        incoming.classList.remove("slide-out");

        this.whenSettled(incoming, () => {
            incoming.classList.remove("slide-in");
        });
    }

    /**
     * transitionend never arrives under reduced motion or in a background tab, so the
     * fallback timer is what actually guarantees the deck never gets stuck.
     */
    whenSettled(card, done) {
        let settled = false;

        const finish = () => {
            if (settled) return;
            settled = true;
            card.removeEventListener("transitionend", onEnd);
            clearTimeout(fallback);

            done();

            setTimeout(() => {
                this.isAnimating = false;
            }, CONFIG.ANIMATION_BUFFER);
        };

        const onEnd = (e) => {
            if (e.target === card && e.propertyName === "transform") finish();
        };
        card.addEventListener("transitionend", onEnd);

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
