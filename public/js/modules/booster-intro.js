import { CONFIG } from "../config.js";
import { Utils } from "./utils.js";
import { setCards } from "./card-renderer.js";
import { BoosterFx } from "./booster-fx.js";
import { packMarkup, packStyle } from "./booster-pack.js";

// A stroke this long (share of the pack width), counted from where it met the pack, cuts it.
const CUT_LENGTH = 0.5;
// Pointer travel (px) under which a press on the pack is a tap: it only shows the hint again.
const TAP_DISTANCE = 8;
// The cards start leaving once the two halves are on their way.
const CUT_SETTLE = 140;
// Flight of the two halves, and when the overlay fades once they are gone.
const HALF_FLIGHT = 950;
const OVERLAY_HOLD = 800;
// Keyboard opening: how long the cut takes to draw itself across the pack.
const AUTO_CUT = 260;
// Tilt (deg) of a hovered pack at its edge.
const MAX_TILT = 10;
// Packs per row while picking, by screen width; fewer packs than that share one row.
const PICK_COLUMNS_NARROW = 3;
const PICK_COLUMNS_WIDE = 5;
const PICK_WIDE_FROM = 700;
// Mini packs stacked in the dock, however many boosters are left.
const DOCK_STACK = 3;

const HINTS = {
    pick: "Pick a booster",
    focus: "Slice the pack, any direction",
};

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
 * pick one, slice it open with a stroke in any direction, and its cards burst out into the
 * deck. Packs still sealed wait in the dock above the deck navigation, and open the same way.
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
        return this.slots.get(id)?.querySelector(".pack:not(.pack-half)");
    }

    /** Sets whose booster is still sealed. */
    sealed() {
        return CONFIG.SETS.filter((set) => !this.deckManager.has(set));
    }

    buildPacks() {
        const stage = this.booster.querySelector(".booster-stage");
        const slots = new Map();
        CONFIG.SETS.forEach((set) => {
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
                `${set.name} booster, ${setCards(set).length} cards`
            );
            pack.innerHTML = `${packMarkup(set)}<span class="pack-ghost"></span>`;

            bob.append(pack);
            slot.append(bob);
            stage.append(slot);
            slots.set(set.id, slot);
        });
        return slots;
    }

    bindEvents() {
        this.onKeydown = (e) => {
            if (e.key === "Escape") this.skip();
        };

        this.booster.addEventListener("click", (e) => this.onPackClick(e));
        this.loader.addEventListener("pointerdown", (e) => this.onDown(e));
        this.loader.addEventListener("pointermove", (e) => this.onMove(e));
        this.loader.addEventListener("pointerup", () => this.onUp());
        this.loader.addEventListener("pointercancel", () => this.onUp());
        this.loader.addEventListener("pointerleave", () => this.untiltAll());
        this.skipBtn.addEventListener("click", () => this.skip());
        this.dock.addEventListener("click", () => this.openSealed());
        // The deck dividers and the binder offer the sealed sets too.
        document.addEventListener("open-booster", (e) => this.openSealed(e.detail.id));
        document.addEventListener("deck-cards-change", () => this.updateDock());
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
        this.dock.setAttribute(
            "aria-label",
            several ? `Open a booster, ${sealed.length} left` : `Open the ${next.name} booster`
        );
        this.dock.querySelector("b").textContent = several
            ? `${sealed.length} boosters`
            : next.name;
        this.dock.querySelector("small").textContent = several
            ? `${sealed.reduce((n, set) => n + setCards(set).length, 0)} cards to open`
            : `${setCards(next).length} cards to open`;
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
        this.skipBtn.textContent = "Not now";
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
        this.loader.classList.remove("is-hidden", "is-cut", "is-revealing");
        // A grid of packs to pick from: up to three per row on a phone, five on a wider
        // screen, the last row centred.
        const perRow = window.innerWidth >= PICK_WIDE_FROM ? PICK_COLUMNS_WIDE : PICK_COLUMNS_NARROW;
        const cols = Math.min(sets.length, perRow);
        const rows = Math.ceil(sets.length / cols);
        this.booster.style.setProperty("--cols", cols);
        this.booster.style.setProperty("--rows", rows);
        this.slots.forEach((slot, id) => {
            const i = sets.findIndex((set) => set.id === id);
            slot.hidden = i < 0;
            slot.classList.remove("is-target");
            this.pack(id).style.visibility = "";
            if (i < 0) return;
            const row = Math.floor(i / cols);
            const inRow = Math.min(cols, sets.length - row * cols);
            slot.style.setProperty("--row", row);
            slot.style.setProperty("--col", (i % cols) + (cols - inRow) / 2);
        });

        if (sets.length === 1) this.focus(sets[0].id);
        else this.setPhase("pick");
    }

    setPhase(phase) {
        this.booster.dataset.phase = phase;
        if (HINTS[phase]) this.hint.textContent = HINTS[phase];
    }

    focus(id) {
        this.target = id;
        this.slots.forEach((slot, key) => slot.classList.toggle("is-target", key === id));
        this.setPhase("focus");
        this.untiltAll();
        this.pack(id).focus({ preventScroll: true });
    }

    onPackClick(e) {
        const pack = e.target.closest(".pack");
        if (!pack || !this.active || this.cutting) return;
        const id = pack.closest(".pack-slot").dataset.pack;

        if (this.phase === "pick") this.focus(id);
        // Enter or Space on the focused pack: the cut draws itself. Pointer clicks are strokes.
        else if (id === this.target && e.detail === 0) this.autoCut();
    }

    /* ---------- The cut ---------- */

    onDown(e) {
        if (this.phase !== "focus" || !this.active || this.cutting) return;
        if (e.target.closest(".booster-skip")) return;
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

    onUp() {
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
        this.reveal({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        });
    }

    /* ---------- Reveal ---------- */

    async reveal(origin) {
        const deck = this.deckManager;
        const set = this.set;
        deck.addSet(set);
        const fresh = deck.cards.filter((card) => card.data.setId === set.id);
        const colors = [set.booster.highlight, set.booster.color, "#ffffff"];
        const fx = this.fx;

        // The backdrop clears and the cards burst out of the pack.
        this.loader.classList.add("is-revealing");
        fx.flash();
        fx.shake(document.body);
        fx.shock(origin.x, origin.y);
        fx.burst(origin.x, origin.y, colors, 90, 11);
        setTimeout(() => this.hide(), OVERLAY_HOLD);

        await deck.playIntro(origin, fresh);

        // The stack lands with a thud.
        const box = deck.deckContainer.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        fx.shock(cx, cy);
        fx.burst(cx, cy, colors, 26, 6);
        if (!fx.calm) {
            deck.deckContainer.animate(
                [{ transform: "scale(1)" }, { transform: "scale(1.04)", offset: 0.35 }, { transform: "scale(1)" }],
                { duration: 380, easing: "ease-out" }
            );
        }
        this.finish();
    }

    hide() {
        this.loader.classList.add("is-hidden");
    }

    skip() {
        if (!this.active || this.cutting) return;
        window.removeEventListener("keydown", this.onKeydown);
        this.hide();
        // First visit: skipping still deals a deck, the first set's.
        if (!this.deckManager.opened.length) this.deckManager.addSet(CONFIG.SETS[0]);
        this.finish();
    }

    finish() {
        this.active = false;
        this.reopening = false;
        this.loader.classList.remove("is-reopen");
        this.skipBtn.textContent = "Skip intro";
        this.deckManager.isAnimating = false;
        this.updateDock();
        this.resolve?.();
        this.resolve = null;
    }

    /* ---------- Hover ---------- */

    // Mouse only: the hovered pack leans towards the pointer and the light follows it.
    tilt(e) {
        if (!this.active || this.cutting || e.pointerType !== "mouse") return;
        const pack = e.target.closest?.(".pack:not(.pack-half)");
        this.untiltAll(pack);
        if (!pack) return;

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
