import { CONFIG } from "../config.js";
import { Utils } from "./utils.js";
import { SwirlBackground } from "./swirl-background.js";
import { CardRenderer, setCards } from "./card-renderer.js";
import { Collection } from "./collection.js";

// Booster intro (playIntro): flight of one card out of the pack, delay between two cards,
// pause on the fan, then the snap back into the stack.
const INTRO_FLIGHT = 1050;
const INTRO_STAGGER = 85;
const INTRO_FAN_HOLD = 900;
const INTRO_GATHER = 520;
// Gap between two fanned cards, as a share of the card width.
const INTRO_FAN_STEP = 0.42;
const INTRO_FAN_STEP_MOBILE = 0.22;
// Height the cards fly up to, as a share of the viewport height.
const INTRO_PEAK = 0.14;
// Tilt (deg) a card leaves the pack with, alternating sides. A full spin reads as a card
// turning in place: the cards are nearly as big as the pack they come out of.
const INTRO_KICK = 30;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class DeckManager {
    constructor() {
        this.isAnimating = false;
        this.isDragging = false;
        this.isBinderOpen = false;
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

    /** Page background behind `card`: its theme colour, or a dark shade of its brand hue. */
    updateBackground(card) {
        const theme = card.getAttribute("theme");
        const brand = card.data?.brand;

        if (!theme && brand) {
            this.body.style.backgroundColor = `color-mix(in srgb, ${brand} 22%, #050505)`;
        } else {
            // Colours live in :root so CSS and JS cannot drift apart.
            const styles = getComputedStyle(document.documentElement);
            this.body.style.backgroundColor =
                styles.getPropertyValue(`--bg-${theme}`).trim() ||
                styles.getPropertyValue("--bg-default").trim();
        }

        this.swirlBackground?.setTheme(theme || "default");
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
     * Booster intro: the cards burst out of the pack at `origin` (viewport coordinates), spin
     * up, land fanned out, then snap into the stack.
     * @param {{x: number, y: number}} [origin] Where the pack was cut. Defaults to the deck.
     * @param {HTMLElement[]} [cards] The cards that were in the pack, in deck order.
     * @returns {Promise<void>} Resolves once the stack is whole and usable.
     */
    async playIntro(origin, cards = this.cards) {
        if (Utils.prefersReducedMotion() || !cards.length) return;

        const deck = this.deckContainer;
        const box = deck.getBoundingClientRect();
        const ox = origin ? origin.x - (box.left + box.width / 2) : 0;
        const oy = origin ? origin.y - (box.top + box.height / 2) : 0;
        const step =
            box.width * (Utils.isMobile() ? INTRO_FAN_STEP_MOBILE : INTRO_FAN_STEP);
        const peak = -window.innerHeight * INTRO_PEAK;

        this.isAnimating = true;

        const flights = cards.map((card, i) => {
            card.classList.add("intro-flying");
            // Front card in the middle, the others alternating left and right of it.
            const side = i === 0 ? 0 : (i % 2 ? -1 : 1) * Math.ceil(i / 2);
            const lift = Math.abs(side) * 22 - window.innerHeight * 0.03;
            const depth = Math.abs(side) * -40;
            const at = (x, y, rotate, scale = 1) =>
                `translate3d(${x}px, ${y}px, ${depth}px) rotate(${rotate}deg) scale(${scale})`;
            const kick = (i % 2 ? 1 : -1) * INTRO_KICK;
            const fan = at(side * step, lift, side * 8);

            const flight = card.animate(
                [
                    { transform: at(ox, oy, kick, 0.25), opacity: 0, easing: "cubic-bezier(.15,.75,.35,1)" },
                    { transform: at(side * step * 0.7, peak, side * 4 - kick * 0.4, 0.92), opacity: 1, offset: 0.42, easing: "cubic-bezier(.5,0,.75,.55)" },
                    { transform: at(side * step * 1.06, lift + 14, side * 10, 1.03), opacity: 1, offset: 0.8, easing: "cubic-bezier(.3,1.3,.5,1)" },
                    { transform: fan, opacity: 1 },
                ],
                { duration: INTRO_FLIGHT, delay: i * INTRO_STAGGER, fill: "both" }
            );
            return { card, fan, flight };
        });

        await Promise.all(flights.map(({ flight }) => flight.finished));
        flights.forEach(({ card }, i) => setTimeout(() => card.playShine(), i * 70));
        await wait(INTRO_FAN_HOLD);

        // Back into the stack. A lone keyframe at offset 0 runs from the fan to whatever the
        // stylesheet says, so each card lands on its own rank. Without the explicit offset it
        // would be the end keyframe, and the cards would fly from the stack out to the fan.
        flights.forEach(({ card }) => card.classList.remove("intro-flying"));
        const last = flights.length - 1;
        const gathers = flights.map(({ card, fan }, i) =>
            card.animate([{ transform: fan, opacity: 1, filter: "brightness(1)", offset: 0 }], {
                duration: INTRO_GATHER,
                delay: (last - i) * 45,
                easing: "cubic-bezier(.6,0,.3,1)",
                fill: "backwards",
            })
        );
        flights.forEach(({ flight }) => flight.cancel());
        await Promise.all(gathers.map((gather) => gather.finished));
        this.isAnimating = false;
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
            this.swirlBackground?.setTheme(
                this.cards[0]?.getAttribute("theme") || "default"
            );
        }

        if (!this.swirlBackground) return;

        if (wanted) this.swirlBackground.enable();
        else this.swirlBackground.disable();
    }
}
