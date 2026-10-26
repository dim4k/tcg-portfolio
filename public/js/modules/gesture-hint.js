import { t } from "../i18n.js";

// localStorage key: set once the visitor has handled the deck, the hint never shows again.
const HINT_KEY = "tcg-gesture-hint";
// Gone by itself after this long (ms), to come back on the next visit.
const HINT_LINGER = 9000;

function wasLearned() {
    try {
        return Boolean(localStorage.getItem(HINT_KEY));
    } catch {
        return false;
    }
}

/**
 * The first time the deck is on screen, a word on how to handle it: throw a card, flip it (when
 * the card in front has a back). It goes at the visitor's first move, and never comes back.
 */
export class GestureHint {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.el = document.getElementById("deck-hint");
        this.learned = wasLearned();
        if (this.learned) return;

        const done = () => this.dismiss(true);
        document.addEventListener("card-flip", done);
        document.addEventListener("deck-change", (e) => {
            if (!e.detail.initial && this.shown) done();
        });
        deckManager.deckContainer.addEventListener("pointerdown", done);
        // A booster or the binder takes the screen: hide it, without counting it as learned.
        document.addEventListener("open-booster", () => this.dismiss(false));
        document.addEventListener("open-expansion", () => this.dismiss(false));
    }

    /** Call once the deck is on screen and usable. */
    show() {
        if (this.learned || this.shown || !this.el || !this.deckManager.cards[0]) return;
        if (this.deckManager.isBinderOpen) return;
        this.shown = true;
        const touch = window.matchMedia("(hover: none)").matches;
        const parts = [t(touch ? "hint.throwTouch" : "hint.throwPointer")];
        if (this.deckManager.cards[0].hasBack) parts.push(t(touch ? "hint.flipTouch" : "hint.flipPointer"));
        this.el.textContent = parts.join(" · ");
        this.el.hidden = false;
        this.timer = setTimeout(() => this.dismiss(false), HINT_LINGER);
    }

    dismiss(learned) {
        if (learned && !this.learned) {
            this.learned = true;
            try {
                localStorage.setItem(HINT_KEY, "1");
            } catch {
                // Storage blocked: it shows again next visit.
            }
        }
        if (!this.shown || this.el.hidden) return;
        clearTimeout(this.timer);
        this.el.classList.add("is-leaving");
        setTimeout(() => {
            this.el.hidden = true;
            this.el.classList.remove("is-leaving");
        }, 300);
    }
}
