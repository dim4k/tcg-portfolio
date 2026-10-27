import { t } from "../i18n.js";

// localStorage key: set once the visitor has handled the deck, the hint never shows again.
const HINT_KEY = "tcg-gesture-hint";
// Gone by itself after this long (ms), to come back on the next visit.
const HINT_LINGER = 9000;
// Room (px) kept between the hint and the edges of the card's picture.
const PICTURE_INSET = 10;

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
        this.place(this.deckManager.cards[0]);
        this.el.hidden = false;
        this.timer = setTimeout(() => this.dismiss(false), HINT_LINGER);
    }

    /**
     * Over the bottom of the card's picture: what covers it hides no text, and keeps clear of
     * the "new" badge at its top. Without a picture, the stylesheet's place, mid-card.
     */
    place(card) {
        const picture = card.shadowRoot?.querySelector(".card-image-container");
        const box = picture?.getBoundingClientRect();
        if (!box?.height) {
            this.el.removeAttribute("data-placed");
            this.el.style.top = this.el.style.maxWidth = "";
            return;
        }
        const deck = this.deckManager.deckContainer.getBoundingClientRect();
        this.el.style.top = `${box.bottom - deck.top - PICTURE_INSET}px`;
        this.el.style.maxWidth = `${box.width - 2 * PICTURE_INSET}px`;
        this.el.dataset.placed = "";
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
