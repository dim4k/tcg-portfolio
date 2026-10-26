import { CONFIG } from "../config.js";
import { Utils } from "./utils.js";
import { setCards } from "./card-renderer.js";
import { BoosterFx } from "./booster-fx.js";
import { packMarkup, packStyle } from "./booster-pack.js";
import { Collection } from "./collection.js";
import { setCardVars } from "./interactions.js";
import { localizeSet, rarityLabel, t } from "../i18n.js";

// A stroke this long (share of the pack width), counted from where it met the pack, cuts it.
const CUT_LENGTH = 0.5;
// Pointer travel (px) under which a press on the pack is a tap: it only shows the hint again.
const TAP_DISTANCE = 8;
// The cards start rising once the two halves are on their way.
const CUT_SETTLE = 140;
// Flight of the two halves.
const HALF_FLIGHT = 950;
// Reveal: the cards rise out of the pack (one after the other from the bottom of the
// stack), each turn takes two halves, a rare shakes before it turns, a gold's back cracks
// then bursts into shards, the card turns in the light while its shine sweeps across, then
// flies into Collection on its own, and a skip sends the rest one after the other.
const RISE = 620;
const RISE_STAGGER = 45;
const FLIP_HALF = 210;
const HOLO_BUILD = 760;
const CRACK_BUILD = 1050;
const CRACK_LINE = 380;
const CRACK_STAGGER = 90;
const SHARD_FLIGHT = 700;
// Cracks across a gold's back, from near its middle out to its edges, one shard between two.
const CRACKS = 8;
// A secret's supernova: drawn back, spinning faster and faster as its back fills with light,
// then the blast and the card landing face up.
const NOVA_WIND = 450;
const NOVA_SPIN = 1150;
const NOVA_TURNS = 3;
const NOVA_LAND = 560;
// The look at a card once it shows, picked up and turned in the hand, and the beat before
// it goes; a rare or a gold stays a little longer. A tap cuts both short.
const INSPECT = 1000;
const INSPECT_HOLD = 80;
const RARE_HOLD = 400;
// How much closer it comes (capped by the viewport share below), and how far it turns (deg).
const INSPECT_CLOSER = 1.25;
const INSPECT_FIT = 0.9;
const INSPECT_TILT = 16;
const TO_COLLECTION = 640;
const FLUSH_STAGGER = 70;
// A revealed card is at most this share of the viewport width, and of the pack's height.
const REVEAL_WIDTH = 0.72;
const REVEAL_HEIGHT = 0.9;
// Keyboard opening: how long the cut takes to draw itself across the pack.
const AUTO_CUT = 260;
// Tilt (deg) of a hovered pack at its edge.
const MAX_TILT = 10;
// Packs per row while picking, by screen width; fewer packs than that share one row.
const PICK_COLUMNS_NARROW = 3;
const PICK_COLUMNS_WIDE = 5;
const PICK_WIDE_FROM = 700;
// Below this width (keep in sync with the carousel styles in index.html), several packs to
// pick from are a carousel instead: one large in the middle, its neighbours peeking out.
const CAROUSEL_BELOW = 600;
// Horizontal travel (px) that turns the carousel by one pack.
const SWIPE_DISTANCE = 40;
// Mini packs stacked in the dock, however many boosters are left.
const DOCK_STACK = 3;

const HINTS = {
    pick: "booster.pick",
    focus: "booster.focus",
};

/** Midpoints of a card shaking harder and harder in place, growing by `grow` a step. */
function trembling(scale, amplitude, grow) {
    return Array.from({ length: 9 }, (_, i) => {
        const k = ((i + 1) / 10) * amplitude;
        return {
            x: (i % 2 ? 1 : -1) * k,
            y: ((i % 3) - 1) * k * 0.5,
            r: (i % 2 ? -1 : 1) * k * 0.4,
            s: scale * (1 + (i + 1) * grow),
            offset: (i + 1) / 10,
        };
    });
}

/** A card of the reveal, placed from the middle of the pack: offset, scale, tilt, turn. */
const pose = ({ x = 0, y = 0, s = 1, r = 0, rx = 0, ry = 0 }) =>
    `translate(${x}px, ${y}px) rotate(${r}deg) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const inRect = (p, r) =>
    p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Whether the segment a-b passes over the rectangle: pointer events can skip right over it. */
function crosses(a, b, rect) {
    for (let i = 1; i < 10; i++) {
        const t = i / 10;
        if (inRect({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, rect)) return true;
    }
    return false;
}

/** The part of a polygon on the positive side of `side(point)` (Sutherland-Hodgman). */
function clipPolygon(points, side) {
    const out = [];
    points.forEach((p, i) => {
        const q = points[(i + 1) % points.length];
        const sp = side(p);
        const sq = side(q);
        if (sp >= 0) out.push(p);
        if (sp >= 0 !== sq >= 0) {
            const t = sp / (sp - sq);
            out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
        }
    });
    return out;
}

/**
 * The boosters: one sealed pack per set of CONFIG.SETS. The first visit opens on all of them;
 * pick one and slice it open with a stroke in any direction. Its cards come out face down:
 * a tap turns the top one over, which then flies into the Collection button. The rare,
 * gold and secret cards of CONFIG.RARITIES come last, each with its own reveal.
 * Packs still sealed wait in the dock above the deck navigation, and open the same way.
 */
export class BoosterIntro {
    /** Whether the inline bootstrap in index.html chose the booster for this visit. */
    static isPending() {
        return document.documentElement.dataset.intro === "booster";
    }

    constructor(deckManager, loader) {
        this.deckManager = deckManager;
        this.loader = loader;
        this.booster = loader.querySelector(".booster");
        this.hint = document.getElementById("booster-hint");
        this.skipBtn = document.getElementById("booster-skip");
        this.dock = document.getElementById("booster-dock");
        this.target = null;
        this.stroke = null;
        this.active = false;
        this.cutting = false;
        this.reopening = false;
        this.resolve = null;
        this._fx = null;
        // The cards of the pack being revealed, top first: { el, card, rarity, t }.
        this.items = [];
        this.busy = false;
        this.tap = null;
        this.revealEl = document.createElement("div");
        this.revealEl.className = "booster-reveal";
        this.revealEl.setAttribute("aria-hidden", "true");
        this.rays = document.createElement("div");
        this.rays.className = "reveal-rays";
        this.revealEl.append(this.rays);
        loader.append(this.revealEl);

        this.slots = this.buildPacks();
        this.bindEvents();
        this.updateDock();
    }

    get fx() {
        this._fx ??= new BoosterFx();
        return this._fx;
    }

    get phase() {
        return this.booster.dataset.phase;
    }

    get set() {
        return CONFIG.SETS.find((set) => set.id === this.target);
    }

    pack(id = this.target) {
        return this.slots.get(id)?.querySelector(".pack:not(.pack-half, .pack-copy)");
    }

    /** The lobby's spotlight takes the colour of the pack `id`. */
    light(id) {
        const set = CONFIG.SETS.find((s) => s.id === id);
        if (set) this.loader.style.setProperty("--light", set.booster.highlight);
    }

    /**
     * The pool of light lies on the floor the packs stand on: the bottom of the stage, once
     * the layout has settled (the stage resizes with the phase).
     */
    placeFloor() {
        cancelAnimationFrame(this.floorFrame);
        this.floorFrame = requestAnimationFrame(() => {
            const stage = this.booster.querySelector(".booster-stage").getBoundingClientRect();
            if (stage.height) this.loader.style.setProperty("--floor", `${Math.round(stage.bottom)}px`);
        });
    }

    /** Sets on offer whose booster is still sealed (the secret ones only once unlocked). */
    sealed() {
        return Collection.sets().filter((set) => !this.deckManager.has(set));
    }

    /** Whether the packs to pick from are laid out as a carousel (narrow screens). */
    get isCarousel() {
        return this.booster.dataset.layout === "carousel";
    }

    buildPacks() {
        const stage = this.booster.querySelector(".booster-stage");
        const slots = new Map();
        CONFIG.SETS.forEach((set) => {
            const { name, tagline } = localizeSet(set);
            const slot = document.createElement("div");
            slot.className = "pack-slot";
            slot.dataset.pack = set.id;
            slot.style.cssText = packStyle(set);

            const bob = document.createElement("div");
            bob.className = "pack-bob";
            const pack = document.createElement("button");
            pack.className = "pack";
            pack.type = "button";
            pack.setAttribute("aria-describedby", "booster-hint");
            pack.setAttribute(
                "aria-label",
                [t("booster.label", { name, n: setCards(set).length }), tagline]
                    .filter(Boolean)
                    .join(", ")
            );
            pack.innerHTML = `${packMarkup(set)}<span class="pack-ghost"></span>`;

            // What is inside, under the pack while picking (the pack's label says it too).
            const caption = document.createElement("span");
            caption.className = "pack-tagline";
            caption.setAttribute("aria-hidden", "true");
            caption.textContent = tagline;
            // Added since the visitor's last visit.
            const ribbon = document.createElement("span");
            ribbon.className = "new-ribbon";
            ribbon.setAttribute("aria-hidden", "true");
            ribbon.textContent = t("booster.new");

            // It stands on a pool of its colour, its reflection on the floor below (a still,
            // decorative copy of the pack).
            const glow = document.createElement("span");
            glow.className = "pack-glow";
            const mirror = document.createElement("span");
            mirror.className = "pack-mirror";
            mirror.setAttribute("aria-hidden", "true");
            mirror.innerHTML = `<span class="pack pack-copy">${packMarkup(set)}</span>`;

            bob.append(pack, ribbon);
            slot.append(glow, bob, mirror, caption);
            stage.append(slot);
            slots.set(set.id, slot);
        });
        return slots;
    }

    bindEvents() {
        this.onKeydown = (e) => {
            if (e.key === "Escape") this.skip();
            // While revealing, Enter or Space plays the tap; on the skip button they skip.
            else if (
                this.phase === "reveal" &&
                (e.key === "Enter" || e.key === " ") &&
                !e.target.closest?.("button")
            ) {
                e.preventDefault();
                this.tapReveal();
            }
        };

        this.booster.addEventListener("click", (e) => this.onPackClick(e));
        this.loader.addEventListener("pointerdown", (e) => this.onDown(e));
        this.loader.addEventListener("pointermove", (e) => this.onMove(e));
        this.loader.addEventListener("pointerup", (e) => this.onUp(e));
        this.loader.addEventListener("pointercancel", () => this.onUp());
        this.loader.addEventListener("pointerleave", () => this.untiltAll());
        this.skipBtn.addEventListener("click", () => this.skip());
        this.dock.addEventListener("click", () => this.openSealed());
        // The deck dividers and the binder offer the sealed sets too.
        document.addEventListener("open-booster", (e) => this.openSealed(e.detail.id));
        document.addEventListener("deck-cards-change", () => this.updateDock());
        // Every card seen: the secret booster shows up in the dock.
        document.addEventListener("collection-complete", () => this.updateDock());
        // The spotlight's pool of light stays under the packs.
        window.addEventListener("resize", () => this.active && this.placeFloor(), { passive: true });
        // Keyboard users tab from pack to pack: the carousel follows the focus. Only theirs: a
        // press focuses the pack under the finger too, and the swipe it starts moves on its own.
        this.booster.addEventListener("focusin", (e) => {
            const slot = e.target.closest?.(".pack-slot");
            if (!slot || !this.isCarousel || this.phase !== "pick") return;
            if (e.target.matches(":focus-visible")) this.turnCarousel(slot.dataset.pack);
        });
    }

    /**
     * The sealed boosters wait in the dock: one is named, with its card count; several show
     * as a little stack and a count, and open the pick among them.
     */
    updateDock() {
        const sealed = this.sealed();
        const show = !this.active && sealed.length > 0 && this.deckManager.opened.length > 0;
        this.dock.hidden = !show;
        if (!show) return;

        const [next] = sealed;
        const several = sealed.length > 1;
        const name = localizeSet(next).name;
        const isNew = sealed.some((set) => Collection.isNew(set));
        this.dock.classList.toggle("is-new", isNew);
        this.dock.setAttribute(
            "aria-label",
            [
                several
                    ? t("dock.openSeveral", { n: sealed.length })
                    : t("dock.openOne", { name }),
                isNew ? t("booster.new") : "",
            ]
                .filter(Boolean)
                .join(", ")
        );
        this.dock.querySelector("b").textContent = several
            ? t("dock.boosters", { n: sealed.length })
            : name;
        this.dock.querySelector("small").textContent = t("dock.toOpen", {
            n: sealed.reduce((n, set) => n + setCards(set).length, 0),
        });
        this.dock.querySelector(".booster-dock-packs").replaceChildren(
            ...sealed.slice(0, DOCK_STACK).map((set) => {
                const mini = document.createElement("span");
                mini.className = "pack-mini";
                mini.dataset.pack = set.id;
                mini.style.cssText = packStyle(set);
                mini.innerHTML = packMarkup(set);
                return mini;
            })
        );
    }

    /* ---------- Showing the packs ---------- */

    /** First visit: every pack, pick one. Resolves once the deck is on screen and usable. */
    run() {
        return new Promise((resolve) => {
            this.resolve = resolve;
            this.show(this.sealed());
        });
    }

    /**
     * Open a sealed set over the deck: straight to cutting it when `id` names one (or when
     * only one is left), else a pick among the sealed ones.
     */
    openSealed(id = null) {
        const deck = this.deckManager;
        if (this.active || deck.isAnimating || deck.isDragging) return;
        const sealed = this.sealed();
        const sets = id ? sealed.filter((set) => set.id === id) : sealed;
        if (!sets.length) return;

        this.reopening = true;
        this.skipBtn.textContent = t("booster.notNow");
        document.documentElement.dataset.intro = "booster";
        this.loader.classList.add("is-reopen");
        this.show(sets);
        return new Promise((resolve) => {
            this.resolve = resolve;
        });
    }

    /** Lay out the packs of `sets` (the others stay out of sight), one to cut or several to pick. */
    show(sets) {
        this.active = true;
        this.cutting = false;
        this.updateDock();
        // The deck stays still underneath: no arrow keys, wheel or drag reach it.
        this.deckManager.isAnimating = true;
        window.addEventListener("keydown", this.onKeydown);

        this.loader.querySelectorAll(".pack-half").forEach((half) => half.remove());
        this.loader.classList.remove("is-hidden", "is-cut");
        this.caught = 0;
        this.skipAsked = false;
        this.flushing = false;
        this.choices = sets.map((set) => set.id);
        // A grid of packs to pick from: up to three per row on a phone, five on a wider
        // screen, the last row centred. Below CAROUSEL_BELOW, a carousel instead.
        const carousel = sets.length > 1 && window.innerWidth < CAROUSEL_BELOW;
        if (carousel) this.booster.dataset.layout = "carousel";
        else delete this.booster.dataset.layout;
        const perRow = window.innerWidth >= PICK_WIDE_FROM ? PICK_COLUMNS_WIDE : PICK_COLUMNS_NARROW;
        const cols = Math.min(sets.length, perRow);
        const rows = Math.ceil(sets.length / cols);
        this.booster.style.setProperty("--cols", cols);
        this.booster.style.setProperty("--rows", rows);
        this.slots.forEach((slot, id) => {
            const i = sets.findIndex((set) => set.id === id);
            slot.hidden = i < 0;
            slot.classList.remove("is-target");
            slot.classList.toggle("is-new", i >= 0 && Collection.isNew(sets[i]));
            this.pack(id).style.visibility = "";
            if (i < 0) return;
            const row = Math.floor(i / cols);
            const inRow = Math.min(cols, sets.length - row * cols);
            slot.style.setProperty("--row", row);
            slot.style.setProperty("--col", (i % cols) + (cols - inRow) / 2);
        });
        if (carousel) this.turnCarousel(sets[0].id);
        this.light(sets[0].id);

        if (sets.length === 1) {
            this.focus(sets[0].id);
        } else {
            this.setPhase("pick");
            // Opened from the dock or the drawer, the focus would be left on a control now
            // hidden: it moves to the first pack. Not on the first visit, where nothing had it.
            if (this.reopening) this.pack(sets[0].id).focus({ preventScroll: true });
        }
    }

    setPhase(phase) {
        this.booster.dataset.phase = phase;
        // The lobby's light and language button follow the phase too (index.html).
        this.loader.dataset.phase = phase;
        const hint = phase === "pick" && this.isCarousel ? "booster.pickSwipe" : HINTS[phase];
        if (hint) this.hint.textContent = t(hint);
        this.placeFloor();
    }

    /** Bring pack `id` to the middle of the carousel: each slot knows how far from it it is. */
    turnCarousel(id) {
        const at = this.choices.indexOf(id);
        if (at < 0) return;
        this.carouselAt = at;
        this.light(id);
        this.choices.forEach((key, i) => {
            const slot = this.slots.get(key);
            slot.style.setProperty("--off", i - at);
            slot.classList.toggle("is-centre", i === at);
            slot.classList.toggle("is-far", Math.abs(i - at) > 1);
        });
    }

    /** One pack further (1) or back (-1) along the carousel. */
    stepCarousel(direction) {
        const next = this.choices[this.carouselAt + direction];
        if (next) this.turnCarousel(next);
        else if (!this.fx.calm) this.nudgeCarousel(direction);
    }

    // At either end: the carousel leans towards the swipe, and comes back.
    nudgeCarousel(direction) {
        this.booster.querySelector(".booster-stage").animate(
            [{ translate: "0 0" }, { translate: `${-direction * 18}px 0` }, { translate: "0 0" }],
            { duration: 320, easing: "ease-out" }
        );
    }

    focus(id) {
        this.target = id;
        this.slots.forEach((slot, key) => slot.classList.toggle("is-target", key === id));
        this.light(id);
        this.setPhase("focus");
        this.untiltAll();
        this.pack(id).focus({ preventScroll: true });
    }

    onPackClick(e) {
        // The click that ends a swipe of the carousel, if the finger lifted over a pack.
        if (performance.now() - (this.swipedAt ?? -Infinity) < 400) return;
        const pack = e.target.closest(".pack");
        if (!pack || !this.active || this.cutting) return;
        const id = pack.closest(".pack-slot").dataset.pack;

        // In the carousel, a pack on the side comes to the middle first.
        if (this.phase === "pick" && this.isCarousel && this.choices[this.carouselAt] !== id) {
            this.turnCarousel(id);
        } else if (this.phase === "pick") this.focus(id);
        // Enter or Space on the focused pack: the cut draws itself. Pointer clicks are strokes.
        else if (id === this.target && e.detail === 0) this.autoCut();
    }

    /* ---------- The cut ---------- */

    onDown(e) {
        if (e.target.closest(".booster-skip")) return;
        if (this.phase === "reveal") {
            this.tap = { x: e.clientX, y: e.clientY };
            return;
        }
        if (this.phase === "pick" && this.isCarousel) {
            this.swipe = { x: e.clientX, y: e.clientY };
            return;
        }
        if (this.phase !== "focus" || !this.active || this.cutting) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;

        // No text selection or native drag while stroking.
        e.preventDefault();
        this.loader.setPointerCapture(e.pointerId);
        this.untiltAll();

        const point = { x: e.clientX, y: e.clientY };
        const inside = inRect(point, this.pack().getBoundingClientRect());
        this.stroke = { start: point, last: point, entry: inside ? point : null };
        this.fx.trace(point.x, point.y);
    }

    onMove(e) {
        const stroke = this.stroke;
        if (!stroke) {
            this.tilt(e);
            return;
        }

        const point = { x: e.clientX, y: e.clientY };
        this.fx.trace(point.x, point.y);
        const rect = this.pack().getBoundingClientRect();

        // The stroke may start anywhere: what counts is the stretch drawn across the pack.
        if (!stroke.entry && (inRect(point, rect) || crosses(stroke.last, point, rect))) {
            stroke.entry = stroke.last;
        }
        stroke.last = point;

        if (stroke.entry && distance(stroke.entry, point) >= rect.width * CUT_LENGTH) {
            this.stroke = null;
            this.cut(stroke.entry, point);
        }
    }

    onUp(e) {
        const swipe = this.swipe;
        this.swipe = null;
        if (swipe && e) {
            const dx = e.clientX - swipe.x;
            const dy = e.clientY - swipe.y;
            if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
                this.swipedAt = performance.now();
                this.stepCarousel(dx < 0 ? 1 : -1);
            }
            return;
        }
        const tap = this.tap;
        this.tap = null;
        if (tap && e && distance(tap, { x: e.clientX, y: e.clientY }) < TAP_DISTANCE * 2) {
            this.tapReveal();
            return;
        }
        const stroke = this.stroke;
        if (!stroke) return;
        this.stroke = null;
        if (distance(stroke.start, stroke.last) < TAP_DISTANCE) this.nudge();
    }

    // A tap instead of a stroke: the hint flashes and the pack wiggles.
    nudge() {
        if (this.fx.calm) return;
        this.hint.animate(
            [
                { transform: "scale(1)" },
                { transform: "scale(1.08)", color: "#8fe3ff" },
                { transform: "scale(1)" },
            ],
            { duration: 450, easing: "ease-in-out" }
        );
        this.pack().animate(
            [{ rotate: "0deg" }, { rotate: "-2deg" }, { rotate: "2deg" }, { rotate: "0deg" }],
            { duration: 400 }
        );
    }

    autoCut() {
        const rect = this.pack().getBoundingClientRect();
        const a = { x: rect.left - rect.width * 0.1, y: rect.top + rect.height * 0.34 };
        const b = { x: rect.right + rect.width * 0.1, y: rect.top + rect.height * 0.2 };
        this.cutting = true;

        const start = performance.now();
        const step = (now) => {
            const k = Math.min(1, (now - start) / AUTO_CUT);
            this.fx.trace(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
            if (k < 1) requestAnimationFrame(step);
            else this.cut(a, b);
        };
        requestAnimationFrame(step);
    }

    /** Split the pack along the line through a and b (viewport points); the halves fly apart. */
    async cut(a, b) {
        if (!this.active) return;
        this.cutting = true;
        window.removeEventListener("keydown", this.onKeydown);

        const pack = this.pack();
        const rect = pack.getBoundingClientRect();
        const width = pack.offsetWidth;
        const height = pack.offsetHeight;
        const scale = rect.width / width || 1;

        // The cut line in the pack's own coordinates, with its unit normal.
        const p = { x: (a.x - rect.left) / scale, y: (a.y - rect.top) / scale };
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const length = Math.hypot(dx, dy) || 1;
        dx /= length;
        dy /= length;
        const nx = -dy;
        const ny = dx;

        // A margin around the box keeps the drop shadow on both halves.
        const box = [
            [-40, -40],
            [width + 40, -40],
            [width + 40, height + 40],
            [-40, height + 40],
        ];
        [1, -1].forEach((sign) => {
            const polygon = clipPolygon(
                box,
                ([x, y]) => sign * ((x - p.x) * nx + (y - p.y) * ny)
            );
            if (polygon.length < 3) return;

            const half = pack.cloneNode(true);
            half.classList.add("pack-half");
            half.removeAttribute("aria-describedby");
            half.setAttribute("aria-hidden", "true");
            half.tabIndex = -1;
            half.style.clipPath = `polygon(${polygon
                .map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`)
                .join(", ")})`;
            pack.parentElement.append(half);

            const fall = window.innerHeight * 0.45 + Math.random() * 90;
            half.animate(
                [
                    { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
                    { transform: `translate(${nx * sign * 24}px, ${ny * sign * 24}px) rotate(${sign * 5}deg)`, opacity: 1, offset: 0.22 },
                    { transform: `translate(${nx * sign * 120}px, ${ny * sign * 120 + fall}px) rotate(${sign * 26}deg)`, opacity: 0 },
                ],
                { duration: HALF_FLIGHT, easing: "cubic-bezier(.25,.6,.6,1)", fill: "forwards" }
            );
        });
        pack.style.visibility = "hidden";

        // The slash runs past both edges of the pack, along the stroke.
        this.fx.slash(
            { x: a.x - dx * rect.width, y: a.y - dy * rect.width },
            { x: b.x + dx * rect.width, y: b.y + dy * rect.width }
        );
        navigator.vibrate?.(25);
        this.loader.classList.add("is-cut");

        await wait(CUT_SETTLE);
        this.reveal();
    }

    /* ---------- Reveal ---------- */

    /** The cards of the pack rise out of it, face down, stacked; the first tap is the visitor's. */
    async reveal() {
        const set = this.set;
        const stage = this.booster.querySelector(".booster-stage").getBoundingClientRect();
        const deckBox = this.deckManager.deckContainer;
        this.center = { x: stage.left + stage.width / 2, y: stage.top + stage.height / 2 };
        this.scale = Math.min(
            1,
            (window.innerWidth * REVEAL_WIDTH) / deckBox.offsetWidth,
            (stage.height * REVEAL_HEIGHT) / deckBox.offsetHeight
        );
        this.closeScale = Math.min(
            this.scale * INSPECT_CLOSER,
            (window.innerWidth * INSPECT_FIT) / deckBox.offsetWidth,
            (window.innerHeight * INSPECT_FIT) / deckBox.offsetHeight
        );
        this.rays.style.left = `${this.center.x}px`;
        this.rays.style.top = `${this.center.y}px`;

        // Commons first, then the rarities in rising order: the best card closes the pack.
        const rank = (data) => Object.keys(CONFIG.RARITIES).indexOf(data.rarity) + 1;
        const cards = setCards(set)
            .map((data, i) => ({ data, i }))
            .sort((a, b) => rank(a.data) - rank(b.data) || a.i - b.i)
            .map(({ data }) => data);
        this.items = cards.map((data, i) => {
            const el = document.createElement("div");
            el.className = "reveal-card is-down";
            el.style.cssText = packStyle(set);
            el.style.left = `${this.center.x}px`;
            el.style.top = `${this.center.y}px`;
            el.style.zIndex = cards.length - i;
            const card = document.createElement("tcg-card");
            // Shown at once, so its picture loads at once.
            card.dataset.pos = "0";
            card.inert = true;
            card.data = data;
            const back = document.createElement("div");
            back.className = "reveal-back";
            back.innerHTML = `<b>${set.code}</b>`;
            el.append(card, back);
            this.revealEl.append(el);
            const rarity = CONFIG.RARITIES[data.rarity] ? data.rarity : null;
            return { el, card, rarity, t: {} };
        });

        // Back on screen: the hint, the skip link, and Collection, where the cards will go.
        this.setPhase("reveal");
        this.hint.textContent = "";
        this.loader.classList.remove("is-cut");
        this.skipBtn.textContent = t("booster.skip");
        document.body.classList.add("booster-revealing");
        window.addEventListener("keydown", this.onKeydown);
        this.fx.burst(this.center.x, this.center.y, [set.booster.highlight, set.booster.color, "#ffffff"], 60, 8);
        this.fx.flash(0.5);

        const s = this.scale;
        this.busy = true;
        const last = this.items.length - 1;
        await Promise.all(
            this.items.map((item, i) => {
                item.t = { y: stage.height * 0.1, s: s * 0.35, o: 0 };
                return this.move(
                    item,
                    { x: -i * 1.2, y: -i * 1.6, s, o: 1 },
                    { duration: RISE, delay: (last - i) * RISE_STAGGER, easing: "cubic-bezier(.2,.9,.3,1.15)" }
                );
            })
        );
        this.busy = false;
        if (this.skipAsked) this.flush();
        else this.prompt();
    }

    /** Animate a card of the reveal from where it stands to `to`, through optional midpoints. */
    move(item, to, { duration, delay = 0, easing = "ease", via = [] }) {
        const from = item.t;
        item.t = { ...from, ...to };
        const frame = (t, offset) => ({ transform: pose(t), opacity: t.o ?? 1, offset });
        item.el.style.transform = pose(item.t);
        item.el.style.opacity = item.t.o ?? 1;
        if (this.fx.calm) return Promise.resolve();
        return item.el
            .animate(
                [
                    frame(from),
                    ...via.map((v) => frame({ ...from, ...item.t, ...v }, v.offset)),
                    frame(item.t),
                ],
                { duration, delay, easing, fill: "backwards" }
            )
            .finished.catch(() => {});
    }

    prompt() {
        const top = this.items[0];
        if (!top) return;
        const total = setCards(this.set).length;
        const at = `${total - this.items.length + 1} / ${total}`;
        // A rare or a gold glows once on top of the stack, not before: it would give itself away.
        const rarity = CONFIG.RARITIES[top.rarity];
        if (rarity && !top.shown) {
            top.el.classList.add(`is-${top.rarity}`);
            if (rarity.reveal === "halo" || rarity.rays) this.raysOn(true);
        }
        const label = rarity && rarityLabel(top.rarity);
        let text = rarity ? t("booster.rarityInside", { rarity: label }) : t("booster.tapReveal");
        if (top.shown) text = rarity ? t("booster.rarityShown", { rarity: label }) : "";
        this.hint.textContent = [text, at].filter(Boolean).join(" · ");
    }

    /**
     * A tap: turn the top card over; once looked at, it goes into the collection by itself.
     * Another tap while it turns or is looked at sends it at once.
     */
    async tapReveal() {
        if (this.phase !== "reveal") return;
        if (this.hurry) {
            this.hurry();
            return;
        }
        if (this.busy) return;
        const top = this.items[0];
        if (!top) return;
        this.busy = true;
        const hurried = { now: false };
        this.hurry = () => (hurried.now = true);
        const reveal = CONFIG.RARITIES[top.rarity]?.reveal;
        if (reveal === "cracks") {
            await this.crackOpen(top);
            this.raysOn(false);
        } else if (reveal === "nova") {
            await this.nova(top);
            this.raysOn(false);
        } else {
            if (reveal === "halo") await this.holoBuild(top);
            await this.turnOver(top);
            // The glow only frames the reveal; the card itself carries on alone.
            this.raysOn(false);
        }
        this.prompt();
        if (!hurried.now) await this.inspect(top, hurried);
        this.hurry = null;

        this.items.shift();
        const flight = this.toCollection(top);
        if (!this.items.length) {
            await flight;
            this.collect();
            return;
        }
        this.busy = false;
        if (this.skipAsked) this.flush();
        else this.prompt();
    }

    /**
     * The card just shown is picked up for a look: it comes closer and turns in the hand, the
     * light running over its face as under the pointer on the deck, then waits a beat.
     * Hurried, it stops where it is and the flight to Collection takes over from there.
     */
    inspect(item, hurried) {
        const from = item.t.s;
        const close = this.closeScale;
        const calm = this.fx.calm;
        const end = INSPECT + INSPECT_HOLD + (item.rarity ? RARE_HOLD : 0);
        return new Promise((resolve) => {
            const begin = performance.now();
            const step = (now) => {
                const time = now - begin;
                const k = Math.min(1, time / INSPECT);
                // Brought closer over the first quarter; the hand turns it all along, flat
                // again by the end, wandering like a real hand rather than swinging evenly.
                const near = calm ? 1 : 1 - (1 - Math.min(1, k / 0.25)) ** 3;
                const hand = calm ? 0 : Math.sin(Math.PI * k);
                const nx = Math.sin(k * Math.PI * 2.2 - 0.6) * hand;
                const ny = Math.sin(k * Math.PI * 1.3 + 0.5) * 0.7 * hand;
                item.t = {
                    ...item.t,
                    x: nx * 6,
                    y: 0,
                    r: nx * 2,
                    rx: ny * INSPECT_TILT,
                    ry: -nx * INSPECT_TILT,
                    s: from + (close - from) * near,
                };
                item.el.style.transform = pose(item.t);
                setCardVars(item.card, { mx: 50 + nx * 45, my: 50 + ny * 45, glare: hand });
                if (hurried.now || time >= end) resolve();
                else requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        });
    }

    // In two halves: the faces swap while the card is edge-on, so the front never shows
    // through the back whatever the browser does with 3D and opacity.
    async turnOver(item) {
        const s = this.scale;
        const set = this.set;
        this.fx.burst(this.center.x, this.center.y, [set.booster.highlight, "#ffffff"], 24, 5);
        await this.move(item, { ry: 90, x: 0, y: -24, r: 0, s: s * 1.1 }, { duration: FLIP_HALF, easing: "cubic-bezier(.5,0,1,1)" });
        item.el.classList.remove("is-down");
        item.t.ry = -90;
        await this.move(item, { ry: 0, y: 0, s: s * 1.04 }, { duration: FLIP_HALF, easing: "cubic-bezier(0,0,.3,1)" });
        item.shown = true;
        item.card.playShine();
    }

    /** A rare shakes in place, growing, then bursts into light before it turns. */
    async holoBuild(item) {
        const s = this.scale;
        const fx = this.fx;
        await this.move(item, { x: 0, y: 0, r: 0, s: s * 1.06 }, {
            duration: HOLO_BUILD,
            easing: "linear",
            via: trembling(s, 6, 0.006),
        });
        fx.flash(0.9);
        fx.shake(document.body, 1.1);
        fx.shock(this.center.x, this.center.y);
        fx.burst(this.center.x, this.center.y, ["#ffffff", this.set.booster.highlight, "#ffd77a", "#ff6ad5"], 120, 12);
        navigator.vibrate?.(30);
    }

    /**
     * A gold: cracks of light run across its back while it trembles, then the back bursts
     * into shards, one between two cracks, and the card shows without turning.
     */
    async crackOpen(item) {
        const s = this.scale;
        const fx = this.fx;
        const back = item.el.querySelector(".reveal-back");
        // In percent of the card, from a point near its middle out to its edges.
        const c = { x: 48 + Math.random() * 4, y: 46 + Math.random() * 6 };
        const angles = Array.from(
            { length: CRACKS },
            (_, i) => ((i + 0.2 + Math.random() * 0.6) / CRACKS) * Math.PI * 2
        );
        const edge = (a) => {
            const dx = Math.cos(a);
            const dy = Math.sin(a);
            const tx = dx > 0 ? (100 - c.x) / dx : dx < 0 ? -c.x / dx : Infinity;
            const ty = dy > 0 ? (100 - c.y) / dy : dy < 0 ? -c.y / dy : Infinity;
            const t = Math.min(tx, ty);
            return { x: c.x + dx * t, y: c.y + dy * t };
        };
        // Each crack zigzags a little on its way out.
        const cracks = angles.map((a) => {
            const e = edge(a);
            const bends = [0.3, 0.6].map((k) => {
                const j = (Math.random() - 0.5) * 9;
                return { x: c.x + (e.x - c.x) * k - Math.sin(a) * j, y: c.y + (e.y - c.y) * k + Math.cos(a) * j };
            });
            return [c, ...bends, e];
        });

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("preserveAspectRatio", "none");
        svg.classList.add("reveal-cracks");
        cracks.forEach((points, i) => {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", `M${points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L")}`);
            path.setAttribute("pathLength", "1");
            path.style.strokeDasharray = "1";
            path.style.strokeDashoffset = fx.calm ? "0" : "1";
            svg.append(path);
            if (!fx.calm) {
                path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
                    duration: CRACK_LINE,
                    delay: i * CRACK_STAGGER,
                    easing: "cubic-bezier(.3,0,.2,1)",
                    fill: "forwards",
                });
            }
        });
        back.append(svg);
        await this.move(item, { x: 0, y: 0, r: 0, s: s * 1.04 }, {
            duration: CRACK_BUILD,
            easing: "linear",
            via: trembling(s, 4, 0.004),
        });

        // The shards: the wedge between two cracks, going out round the corners it holds.
        const corners = [{ x: 100, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 0 }, { x: 100, y: 0 }];
        const angleOf = (p) => {
            const a = Math.atan2(p.y - c.y, p.x - c.x);
            return a < 0 ? a + Math.PI * 2 : a;
        };
        svg.remove();
        const shards = cracks.map((points, i) => {
            const next = cracks[(i + 1) % CRACKS];
            const a0 = angles[i];
            const a1 = i + 1 < CRACKS ? angles[i + 1] : angles[0] + Math.PI * 2;
            const between = corners
                .map((p) => {
                    const a = angleOf(p);
                    return { p, a: a < a0 ? a + Math.PI * 2 : a };
                })
                .filter(({ a }) => a > a0 && a < a1)
                .sort((p, q) => p.a - q.a)
                .map(({ p }) => p);
            const polygon = [...points, ...between, ...next.slice(1).reverse()];
            const shard = back.cloneNode(true);
            shard.classList.add("reveal-shard");
            shard.style.clipPath = `polygon(${polygon.map((p) => `${p.x.toFixed(1)}% ${p.y.toFixed(1)}%`).join(", ")})`;
            item.el.append(shard);
            return { shard, angle: (a0 + a1) / 2 };
        });
        item.el.classList.remove("is-down");
        fx.flash(0.95);
        fx.shake(document.body, 1);
        fx.shock(this.center.x, this.center.y);
        fx.burst(this.center.x, this.center.y, ["#fff3c4", "#f3d27a", "#ffffff", "#c9a23f"], 130, 12);
        navigator.vibrate?.(30);
        await Promise.all(
            shards.map(({ shard, angle }) => {
                if (fx.calm) return Promise.resolve();
                const d = 180 + Math.random() * 120;
                const r = (Math.random() - 0.5) * 70;
                return shard
                    .animate(
                        [
                            { transform: "none", opacity: 1 },
                            {
                                transform: `translate(${Math.cos(angle) * d}px, ${Math.sin(angle) * d + 80}px) rotate(${r}deg) scale(.85)`,
                                opacity: 0,
                            },
                        ],
                        { duration: SHARD_FLIGHT, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" }
                    )
                    .finished.catch(() => {});
            })
        );
        shards.forEach(({ shard }) => shard.remove());
        item.shown = true;
        item.card.playShine();
    }

    /**
     * A secret: drawn back trembling, it spins faster and faster while its back fills with
     * light, then bursts like a star, and the card lands face up in the middle of the blast.
     */
    async nova(item) {
        const s = this.scale;
        const fx = this.fx;
        const { x, y } = this.center;
        item.el.classList.add("is-charging");
        await this.move(item, { x: 0, y: 12, r: 0, s: s * 0.94 }, {
            duration: NOVA_WIND,
            easing: "linear",
            via: trembling(s * 0.97, 3, -0.003),
        });
        fx.burst(x, y, ["#ffffff", "#dccbff", "#bff3ff"], 40, 4);
        // Edge-on at the end of the last turn: the faces swap there.
        await this.move(item, { y: -18, ry: NOVA_TURNS * 360 + 90, s: s * 1.12 }, {
            duration: NOVA_SPIN,
            easing: "cubic-bezier(.55,0,.9,.6)",
        });
        item.el.classList.remove("is-down", "is-charging");
        fx.flash(1);
        fx.shake(document.body, 1.3);
        fx.shock(x, y);
        fx.burst(x, y, ["#ffffff", "#ffc2ec", "#bff3ff", "#dccbff", "#fff3a0"], 170, 15);
        fx.burst(x, y, ["#ffffff", "#e6dcff"], 60, 6);
        navigator.vibrate?.([30, 40, 50]);
        item.t.ry = -90;
        await this.move(item, { ry: 0, y: 0, s: s * 1.04 }, {
            duration: NOVA_LAND,
            easing: "cubic-bezier(.2,1.5,.4,1)",
        });
        item.shown = true;
        item.card.playShine();
    }

    raysOn(on) {
        if (this.rays.classList.contains("is-on") === on) return;
        this.rays.classList.toggle("is-on", on);
    }

    /** The card flies in an arc into the Collection button, which catches it. */
    toCollection(item, delay = 0) {
        if (item.rarity) this.raysOn(false);
        const btn = document.getElementById("collection-btn").getBoundingClientRect();
        const c = {
            x: btn.left + btn.width / 2 - this.center.x,
            y: btn.top + btn.height / 2 - this.center.y,
        };
        const t = item.t;
        const arc = {
            x: (t.x + c.x) / 2 + 40,
            y: Math.min(t.y, c.y) + (t.y - c.y) * 0.25 - 30,
            s: t.s * 0.42,
            r: 14,
            o: 1,
            offset: 0.5,
        };
        item.el.style.zIndex = 100;
        return this.move(item, { x: c.x, y: c.y, s: 0.04, r: 24, o: 0 }, {
            duration: TO_COLLECTION,
            delay,
            easing: "cubic-bezier(.5,0,.4,1)",
            via: [arc],
        }).then(() => {
            item.el.remove();
            this.caught += 1;
            this.fx.burst(btn.left + btn.width / 2, btn.top + btn.height / 2, ["#8fe3ff", "#ffffff"], 14, 3.5);
            document.dispatchEvent(
                new CustomEvent("collection-catch", { detail: { count: this.caught } })
            );
        });
    }

    /** Skip: every card left turns over and flies into Collection, one after the other. */
    async flush() {
        if (this.flushing) return;
        // A card still rising or turning: skip once it is done, without the look at it.
        if (this.busy) {
            this.skipAsked = true;
            this.hurry?.();
            return;
        }
        this.flushing = true;
        this.busy = true;
        const items = this.items;
        this.items = [];
        items.forEach((item) => item.el.classList.remove("is-down"));
        await Promise.all(items.map((item, i) => this.toCollection(item, i * FLUSH_STAGGER)));
        this.collect();
    }

    /** The pack is empty: its cards join the deck, which comes back. */
    collect() {
        const deck = this.deckManager;
        deck.addSet(this.set);
        this.revealEl.querySelectorAll(".reveal-card").forEach((el) => el.remove());
        this.raysOn(false);
        document.body.classList.remove("booster-revealing");
        this.hide();
        if (!this.fx.calm) {
            deck.deckContainer.animate(
                [{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "none" }],
                { duration: 600, easing: "cubic-bezier(.2,.8,.3,1)" }
            );
        }
        this.finish();
    }

    hide() {
        this.loader.classList.add("is-hidden");
        this.deckManager.setCovered(false);
    }

    skip() {
        if (!this.active) return;
        if (this.phase === "reveal") {
            this.flush();
            return;
        }
        if (this.cutting) return;
        window.removeEventListener("keydown", this.onKeydown);
        this.hide();
        // First visit: skipping still deals a deck, the first set's.
        if (!this.deckManager.opened.length) this.deckManager.addSet(CONFIG.SETS[0]);
        this.finish();
    }

    finish() {
        window.removeEventListener("keydown", this.onKeydown);
        this.busy = false;
        this.setPhase("done");
        this.active = false;
        this.reopening = false;
        this.loader.classList.remove("is-reopen");
        this.skipBtn.textContent = t("booster.skipIntro");
        this.deckManager.isAnimating = false;
        this.updateDock();
        this.resolve?.();
        this.resolve = null;
    }

    /* ---------- Hover ---------- */

    // Mouse only: the hovered pack leans towards the pointer and the light follows it.
    tilt(e) {
        if (!this.active || this.cutting || e.pointerType !== "mouse") return;
        const pack = e.target.closest?.(".pack:not(.pack-half, .pack-copy)");
        this.untiltAll(pack);
        if (!pack) return;
        // While picking, the spotlight turns to the pack under the mouse.
        if (this.phase === "pick") this.light(pack.closest(".pack-slot").dataset.pack);

        const rect = pack.getBoundingClientRect();
        const nx = Utils.clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
        const ny = Utils.clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
        const style = pack.style;
        style.setProperty("--ry", `${nx * MAX_TILT}deg`);
        style.setProperty("--rx", `${-ny * MAX_TILT}deg`);
        style.setProperty("--px", `${50 + nx * 40}%`);
        style.setProperty("--py", `${50 + ny * 40}%`);
        pack.classList.add("is-tracking");
    }

    untiltAll(except = null) {
        this.slots.forEach((slot) => {
            const pack = this.pack(slot.dataset.pack);
            if (!pack || pack === except || !pack.classList.contains("is-tracking")) return;
            pack.classList.remove("is-tracking");
            pack.style.setProperty("--rx", "0deg");
            pack.style.setProperty("--ry", "0deg");
        });
    }
}
