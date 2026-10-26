import { CONFIG } from "../config.js";
import { t } from "../i18n.js";

// How long the bubble naming the card stays up after a drag or a tap on the track.
const TIP_LINGER = 900;

/**
 * Under the deck: previous/next buttons around a track cut into one segment per set, at its
 * colour and to the scale of its cards. Dragging along the track leafs through the deck, with
 * a bubble naming the card under the thumb; the width stays the same at 10 or 200 cards.
 * Also voices each card change for screen readers, since the deck itself only moves pixels.
 */
export class DeckNav {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.scrub = document.getElementById("deck-scrub");
        this.track = document.getElementById("deck-scrub-track");
        this.thumb = this.scrub.querySelector(".deck-scrub-thumb");
        this.fill = this.scrub.querySelector(".deck-scrub-fill");
        this.tip = this.scrub.querySelector(".deck-scrub-tip");
        this.count = document.getElementById("deck-count");
        this.status = document.getElementById("deck-status");
        this.dragging = false;

        document
            .getElementById("deck-prev")
            .addEventListener("click", () => this.deckManager.rotateCards(-1));
        document
            .getElementById("deck-next")
            .addEventListener("click", () => this.deckManager.rotateCards(1));

        this.bindScrub();
        document.addEventListener("deck-cards-change", () => this.build());
        document.addEventListener("deck-change", (e) => this.sync(e.detail));

        // The deck announced its first cards before these listeners existed.
        this.build();
        this.sync({ index: deckManager.activeIndex, initial: true });
    }

    // One segment per run of cards of the same set, as wide as its share of the deck.
    build() {
        const segments = [];
        this.deckManager.cardData.forEach((card) => {
            const last = segments[segments.length - 1];
            if (last && last.setId === card.setId) last.count++;
            else segments.push({ setId: card.setId, count: 1 });
        });
        this.track.replaceChildren(
            ...segments.map(({ setId, count }) => {
                const set = CONFIG.SETS.find((s) => s.id === setId);
                const segment = document.createElement("span");
                segment.style.flexGrow = count;
                segment.style.setProperty("--set-color", set?.booster.highlight || "#fff");
                return segment;
            })
        );
        this.scrub.setAttribute("aria-valuemin", 1);
        this.scrub.setAttribute("aria-valuemax", this.deckManager.cardData.length);
        this.scrub.hidden = this.deckManager.cardData.length < 2;
    }

    sync({ index, initial }) {
        const cards = this.deckManager.cardData;
        const card = cards[index];
        const total = cards.length;
        const at = total > 1 ? (index / (total - 1)) * 100 : 50;

        this.thumb.style.left = `${at}%`;
        this.fill.style.width = `${at}%`;
        this.tip.style.left = `${at}%`;
        this.count.textContent = total ? `${index + 1} / ${total}` : "";
        if (!card) return;

        this.tip.innerHTML = "<b></b><small></small>";
        this.tip.querySelector("b").textContent = card.header.name;
        this.tip.querySelector("small").textContent = card.setLabel;
        this.scrub.setAttribute("aria-valuenow", index + 1);
        this.scrub.setAttribute(
            "aria-valuetext",
            t("nav.valueText", { name: card.header.name, i: index + 1, n: total })
        );

        if (initial || !this.status) return;
        this.status.textContent = t("nav.status", { name: card.header.name, i: index + 1, n: total });
    }

    bindScrub() {
        const scrub = this.scrub;

        scrub.addEventListener("pointerdown", (e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            scrub.setPointerCapture(e.pointerId);
            this.dragging = true;
            scrub.classList.add("is-dragging", "show-tip");
            this.pick(e.clientX);
        });
        scrub.addEventListener("pointermove", (e) => {
            if (this.dragging) this.pick(e.clientX);
        });
        const end = () => {
            if (!this.dragging) return;
            this.dragging = false;
            scrub.classList.remove("is-dragging");
            clearTimeout(this.tipTimer);
            this.tipTimer = setTimeout(() => scrub.classList.remove("show-tip"), TIP_LINGER);
        };
        scrub.addEventListener("pointerup", end);
        scrub.addEventListener("pointercancel", end);

        // Arrows step one card; the deck must not also react to them (interactions.js).
        scrub.addEventListener("keydown", (e) => {
            const steps = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
            const deck = this.deckManager;
            if (steps[e.key]) {
                e.preventDefault();
                deck.rotateCards(steps[e.key]);
            } else if (e.key === "Home" || e.key === "End") {
                e.preventDefault();
                deck.goTo(e.key === "Home" ? 0 : deck.cardData.length - 1, { instant: true });
            }
        });
    }

    // The card at that point of the track comes to the front at once, without the shuffle.
    pick(clientX) {
        const box = this.scrub.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
        const index = Math.round(ratio * (this.deckManager.cardData.length - 1));
        if (index !== this.deckManager.activeIndex) {
            this.deckManager.goTo(index, { instant: true });
        }
    }
}
