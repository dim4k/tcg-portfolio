import { CONFIG } from "../config.js";
import { Utils } from "./utils.js";
import { SwirlBackground } from "./swirl-background.js";
import { CardRenderer, setCards } from "./card-renderer.js";
import { Collection } from "./collection.js";

export class DeckManager {
    constructor() {
        this.isAnimating = false;
        this.isDragging = false;
        this.isBinderOpen = false;
        // A card taken out of a binder pocket: while set, it follows the pointer and the
        // gyroscope instead of the front card (interactions.js).
        this.peekCard = null;
        this.swirlBackground = null;
        this.body = document.body;
        this.cards = [];
        this.frontCard = null;
        this.hasAnnounced = false;
        this.deckContainer = document.getElementById("deck");
        this.renderer = new CardRenderer("deck");
        /** Sets whose booster is opened (entries of CONFIG.SETS, in config order). */
        this.opened = [];
        /** Id of the set the deck is narrowed to, or "all". */
        this.filter = "all";
        /** Card data dealt into the deck: every opened set in turn, or only the filtered one. */
        this.cardData = [];
    }

    /**
     * @param {object[]} opened Sets already in the collection. Empty while a booster intro is
     *     pending: the deck is dealt when the first pack is opened.
     * @param {{set: object, index: number}} [start] Card to show in front.
     */
    init(opened, start = null) {
        this.opened = CONFIG.SETS.filter((set) => opened.includes(set));
        if (this.opened.length) Collection.save(this.opened);
        this.deal(start);
        this.syncBackground();

        // Rotating a phone or resizing across the breakpoint must re-evaluate the background.
        Utils.mobileMql.addEventListener("change", () => this.syncBackground());
        Utils.reducedMotionMql.addEventListener("change", () =>
            this.syncBackground()
        );
    }

    /** Index in cardData of the card in front. */
    get activeIndex() {
        return Number(this.cards[0]?.dataset.index ?? 0);
    }

    /** Whether the booster of `set` has been opened. */
    has(set) {
        return this.opened.includes(set);
    }

    /** Index in cardData of the card `index` of `set`, or -1 when the filter hides it. */
    indexOf(set, index) {
        const first = this.cardData.findIndex((card) => card.setId === set.id);
        return first < 0 ? -1 : first + index;
    }

    /**
     * A booster was just opened: its cards join the collection, and the deck shows the whole
     * collection again, starting on the first new card.
     */
    addSet(set) {
        if (!this.has(set)) {
            this.opened = CONFIG.SETS.filter((s) => s === set || this.opened.includes(s));
            Collection.save(this.opened);
        }
        this.filter = "all";
        this.deal({ set, index: 0 });
    }

    /** Narrow the deck to one set (its id), or show them all ("all"). */
    setFilter(filter) {
        if (filter === this.filter || this.isAnimating || this.isDragging) return;
        this.filter = filter;
        this.deal();
    }

    /** Bring a card to the front, opening its set or switching the filter when needed. */
    showCard(set, index) {
        if (!this.has(set)) {
            this.addSet(set);
        } else if (this.indexOf(set, 0) < 0) {
            this.filter = set.id;
            this.deal({ set, index });
            return;
        }
        this.goTo(this.indexOf(set, index));
    }

    /**
     * Render the cards of the opened sets the filter lets through. Listeners hear
     * "deck-cards-change" before the "deck-change" of the new front card.
     */
    deal(start = null) {
        const sets = this.opened.filter(
            (set) => this.filter === "all" || set.id === this.filter
        );
        this.cardData = sets.flatMap((set) => setCards(set));
        const startIndex = start ? Math.max(0, this.indexOf(start.set, start.index)) : 0;
        this.renderer.render(this.cardData, startIndex);

        const cards = Array.from(this.deckContainer.querySelectorAll("tcg-card"));
        this.cards = [...cards.slice(startIndex), ...cards.slice(0, startIndex)];
        this.frontCard = null;
        document.dispatchEvent(
            new CustomEvent("deck-cards-change", {
                detail: { opened: this.opened, filter: this.filter },
            })
        );
        this.updatePositions();
    }

    setBinderOpen(open) {
        this.isBinderOpen = open;
        this.body.classList.toggle("binder-active", open);
        // The deck stays in the DOM behind the binder; nothing in it may take focus meanwhile.
        this.deckContainer.inert = open;
        this.syncBackground();
    }

    updatePositions() {
        this.cards.forEach((card, index) => {
            card.dataset.pos = index;
            card.style.setProperty(
                "--stack-depth",
                Math.min(index, CONFIG.MAX_STACK_DEPTH)
            );
            card.toggleAttribute("data-behind", index > CONFIG.MAX_STACK_DEPTH);
            card.style.transform = "";
            card.classList.remove("slide-out", "from-back");
            // Cards behind are drawn but out of reach: no focus, no screen reader.
            card.inert = index !== 0;
            if (index !== 0) card.flipped = false;
        });

        const front = this.cards[0];
        if (!front) return;

        this.updateBackground(front);

        if (front !== this.frontCard) {
            const initial = !this.hasAnnounced;
            this.hasAnnounced = true;
            this.frontCard = front;
            document.dispatchEvent(
                new CustomEvent("deck-change", {
                    detail: {
                        card: front,
                        index: Number(front.dataset.index),
                        total: this.cards.length,
                        initial,
                    },
                })
            );
        }
    }

    /**
     * Page background behind `card`: the colour of its rarity for a rare or gold card, else its
     * theme colour, or a dark shade of its brand hue.
     */
    updateBackground(card) {
        const theme = card.getAttribute("theme");
        const rarity = card.getAttribute("rarity");
        const brand = card.data?.brand;
        // Colours live in :root so CSS and JS cannot drift apart.
        const styles = getComputedStyle(document.documentElement);

        if (rarity) {
            this.body.style.backgroundColor = styles.getPropertyValue(`--bg-${rarity}`).trim();
        } else if (!theme && brand) {
            this.body.style.backgroundColor = `color-mix(in srgb, ${brand} 22%, #050505)`;
        } else {
            this.body.style.backgroundColor =
                styles.getPropertyValue(`--bg-${theme}`).trim() ||
                styles.getPropertyValue("--bg-default").trim();
        }

        // The rarity also lights the room (base.css) and colours the swirl.
        if (rarity) this.body.dataset.rarity = rarity;
        else delete this.body.dataset.rarity;
        this.swirlBackground?.setTheme(this.backgroundTheme(card));
    }

    /** Swirl colours for `card`: its rarity's, else its theme's. */
    backgroundTheme(card) {
        return card?.getAttribute("rarity") || card?.getAttribute("theme") || "default";
    }

    /**
     * @param {number} direction 1 sends the front card to the back, -1 brings the back one forward.
     */
    rotateCards(direction = 1) {
        if (this.isAnimating || this.isBinderOpen || this.isDragging) return;
        if (this.cards.length < 2) return;

        this.isAnimating = true;

        // Both directions play the same move: the card that has to change ends drops out
        // of the stack, then climbs back in at the other end.
        const forward = direction >= 0;
        const moving = forward
            ? this.cards[0]
            : this.cards[this.cards.length - 1];

        moving.classList.add("slide-out");
        if (!forward) moving.classList.add("from-back");

        this.whenSettled(moving, () => {
            // Rotate the array instead of moving DOM elements
            if (forward) this.cards.push(this.cards.shift());
            else this.cards.unshift(this.cards.pop());
            this.updatePositions();
        });
    }

    /**
     * Bring the card at `index` (in cardData) to the front. Neighbours use the regular
     * rotation; a longer jump reorders the stack in one go and lets the CSS transitions run.
     * @param {{instant?: boolean}} [options] instant: reorder without any motion, for the
     *     scrubber, which calls this on every pointer move.
     */
    goTo(index, { instant = false } = {}) {
        if (this.isAnimating || this.isBinderOpen || this.isDragging) return;

        const pos = this.cards.findIndex(
            (card) => Number(card.dataset.index) === index
        );
        if (pos <= 0) return;
        if (instant) {
            this.cards = [...this.cards.slice(pos), ...this.cards.slice(0, pos)];
            this.cards.forEach((card) => card.classList.add("no-transition"));
            this.updatePositions();
            void this.deckContainer.offsetWidth;
            this.cards.forEach((card) => card.classList.remove("no-transition"));
            return;
        }
        if (pos === 1) return this.rotateCards(1);
        if (pos === this.cards.length - 1) return this.rotateCards(-1);

        this.isAnimating = true;
        this.cards = [...this.cards.slice(pos), ...this.cards.slice(0, pos)];
        this.updatePositions();
        setTimeout(() => {
            this.isAnimating = false;
        }, CONFIG.ANIMATION_DELAY + CONFIG.ANIMATION_BUFFER);
    }

    /**
     * Send the dragged front card flying along the drag direction, then park it at the back.
     */
    throwCard(card, dx, dy) {
        this.isAnimating = true;

        const dist = Math.hypot(dx, dy) || 1;
        const reach = Math.hypot(window.innerWidth, window.innerHeight);
        const ux = dx / dist;
        const uy = dy / dist;

        card.classList.remove("is-dragging");
        card.classList.add("thrown");
        card.style.transform = `translate3d(${ux * reach}px, ${uy * reach}px, 0) rotate(${ux * 30}deg)`;

        this.whenSettled(card, () => {
            card.classList.remove("thrown");
            card.classList.add("no-transition");
            this.cards.push(this.cards.shift());
            this.updatePositions();
            void card.offsetWidth;
            card.classList.remove("no-transition");
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
            !this.isBinderOpen &&
            !Utils.isMobile() &&
            !Utils.prefersReducedMotion();

        if (wanted && !this.swirlBackground) {
            this.swirlBackground = SwirlBackground.create("canvas-background");
            this.swirlBackground?.setTheme(this.backgroundTheme(this.cards[0]));
        }

        if (!this.swirlBackground) return;

        if (wanted) this.swirlBackground.enable();
        else this.swirlBackground.disable();
    }
}
