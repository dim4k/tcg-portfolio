import { CONFIG } from "../config.js";
import { icon } from "./icons.js";
import { setCards } from "./card-renderer.js";

// Natural size a thumbnail is laid out at before being scaled into its pocket.
// Keep in sync with --thumb-w / --thumb-h in binder.css.
const THUMB_WIDTH = 430.8;
// Pockets on a page, three by three like a real binder sheet.
const POCKETS = 9;
// Two pages side by side from this viewport width, one below.
const SPREAD_MIN_WIDTH = 900;
// Width / height of a page. Keep in sync with the pocket layout in binder.css.
const PAGE_RATIO = 0.72;
// Room around the book: the toolbar above, the page navigation below, the tabs on the side.
const ROOM_TOP = 96;
const ROOM_BOTTOM = 84;
const ROOM_TABS = 110;
const GUTTER = 16;
// A dragged page turns once pulled past this share of its width.
const TURN_THRESHOLD = 0.3;
// Must match the .leaf transition in binder.css.
const TURN_DURATION = 800;
const JUMP_STEP = 110;
// Pointer travel (px) under which a press on the book is a tap.
const TAP_DISTANCE = 8;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * The binder: a book whose pages turn with a drag or a tap. A cover, then for each set of
 * CONFIG.SETS a divider page and as many sheets of nine pockets as its cards need. Two pages
 * side by side on wide screens, one on narrow ones. Sets still sealed show mystery pockets and
 * a button to open their booster; picking a card sends it to the front of the deck.
 */
export class BinderView {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.root = document.getElementById("binder");
        this.toggleBtn = document.getElementById("view-toggle-btn");
        this.book = document.getElementById("binder-book");
        // Moved into the book on each build, to be stacked between its leaves (see show()).
        this.rings = this.root.querySelector(".binder-rings");
        this.tabsRoot = document.getElementById("binder-tabs");
        this.pageLabel = document.getElementById("binder-page");
        this.pages = [];
        this.leaves = [];
        this.thumbs = new Map();
        this.mode = null;
        // Leaves turned over to the left: the visible page is leaf `turned`.
        this.turned = 0;
        this.drag = null;
        this.isOpen = false;
        this.stale = true;

        this.toggleBtn.addEventListener("click", () =>
            this.isOpen ? this.close() : this.open()
        );
        document.addEventListener("open-expansion", (e) => this.open(e.detail.id));
        // A booster opens over the deck, wherever it was asked for (the collection drawer, a
        // divider page): the binder makes way, or it would hide the cards coming out.
        // Registered before BoosterIntro's listener (main.js), so it closes first.
        document.addEventListener("open-booster", () => this.close());
        // Opened boosters fill pockets: rebuild on the next opening.
        document.addEventListener("deck-cards-change", () => {
            this.stale = true;
        });
        document
            .getElementById("binder-prev")
            .addEventListener("click", () => this.turn(-1));
        document
            .getElementById("binder-next")
            .addEventListener("click", () => this.turn(1));
        this.tabsRoot.addEventListener("click", (e) => {
            const tab = e.target.closest("button");
            if (tab) this.jumpTo(Number(tab.dataset.page));
        });
        window.addEventListener("keydown", (e) => this.onKeydown(e));
        window.addEventListener("resize", () => this.isOpen && this.build(), {
            passive: true,
        });

        this.bindBook();
    }

    /** @param {string} [setId] Open on that set's divider page. */
    open(setId) {
        this.isOpen = true;
        this.root.hidden = false;
        this.deckManager.setBinderOpen(true);
        this.syncToggle();
        this.build();

        if (setId) {
            const at = this.pages.findIndex((p) => p.kind === "divider" && p.set.id === setId);
            if (at >= 0) this.show(this.leafOf(at), false);
        }
        // Focus the binder itself: the next Tab lands inside the book, and a mouse or touch
        // user does not get a focus ring on something they never aimed at.
        this.root.focus({ preventScroll: true });
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.root.hidden = true;
        this.deckManager.setBinderOpen(false);
        this.syncToggle();
        this.toggleBtn.focus();
    }

    syncToggle() {
        const state = this.isOpen
            ? CONFIG.VIEW_TOGGLE.binder
            : CONFIG.VIEW_TOGGLE.deck;
        this.toggleBtn.querySelector("svg")?.replaceWith(icon(state.icon));
        this.toggleBtn.querySelector("span").textContent = state.label;
        this.toggleBtn.setAttribute("aria-pressed", String(this.isOpen));
    }

    onKeydown(e) {
        if (!this.isOpen) return;
        if (e.key === "Escape") this.close();
        else if (e.key === "ArrowRight") this.turn(1);
        else if (e.key === "ArrowLeft") this.turn(-1);
    }

    /* ---------- Pages ---------- */

    /** The cover, then each set: its divider and as many sheets as its cards need. */
    listPages() {
        const pages = [{ kind: "cover" }];
        CONFIG.SETS.forEach((set) => {
            const cards = setCards(set);
            pages.push({ kind: "divider", set, cards });
            for (let from = 0; from < cards.length; from += POCKETS) {
                pages.push({ kind: "sheet", set, cards, from });
            }
        });
        return pages;
    }

    /** Index of the leaf showing page `at`. */
    leafOf(at) {
        return this.mode === "spread" ? Math.ceil(at / 2) : at;
    }

    build() {
        const mode = window.innerWidth >= SPREAD_MIN_WIDTH ? "spread" : "single";
        if (!this.stale && mode === this.mode) {
            this.layout();
            return;
        }
        // Keep the reader on the same page across a rebuild.
        const shown = this.mode === "spread" ? Math.max(0, 2 * this.turned - 1) : this.turned;
        this.mode = mode;
        this.stale = false;
        this.root.dataset.mode = mode;

        this.pages = this.listPages();
        this.thumbs.clear();
        const faces = this.pages.map((page, at) => this.pageEl(page, at + 1));
        if (mode === "spread") {
            // The verso of the last leaf is never on screen: it gets the back cover, after a
            // blank page if the count of pages would leave content there.
            if (faces.length % 2 === 0) faces.push(this.pageEl({ kind: "verso" }));
            faces.push(this.pageEl({ kind: "back" }));
        }

        // Spread: each leaf carries two pages, front and back. Single: one page and a blank verso.
        const count = mode === "spread" ? faces.length / 2 : faces.length;
        this.leaves = Array.from({ length: count }, (_, j) => {
            const leaf = document.createElement("div");
            leaf.className = "leaf";
            const front = document.createElement("div");
            front.className = "leaf-face front";
            front.append(mode === "spread" ? faces[2 * j] : faces[j]);
            const back = document.createElement("div");
            back.className = "leaf-face back";
            back.append(mode === "spread" ? faces[2 * j + 1] : this.pageEl({ kind: "verso" }));
            leaf.append(front, back);
            return leaf;
        });
        this.book.replaceChildren(...this.leaves, this.rings);

        this.buildTabs();
        this.layout();
        this.show(clamp(this.leafOf(shown), 0, count - 1), false);
    }

    layout() {
        const width = document.documentElement.clientWidth;
        const height = window.innerHeight;
        const spread = this.mode === "spread";
        const cols = spread ? 2 : 1;
        const sideRoom = spread ? 2 * ROOM_TABS : 2 * GUTTER;
        const topRoom = ROOM_TOP + (spread ? 0 : 44);
        const pageWidth = Math.floor(
            Math.max(
                160,
                Math.min((width - sideRoom) / cols, (height - topRoom - ROOM_BOTTOM) * PAGE_RATIO)
            )
        );
        this.root.style.setProperty("--page-w", `${pageWidth}px`);
        this.root.style.setProperty("--page-h", `${Math.floor(pageWidth / PAGE_RATIO)}px`);
        this.root.style.setProperty("--cols", cols);

        // Thumbnails are full cards scaled down to the width of a pocket.
        const pocket = this.book.querySelector(".pocket");
        if (pocket) {
            this.root.style.setProperty(
                "--thumb-zoom",
                (pocket.offsetWidth / THUMB_WIDTH).toFixed(4)
            );
        }
    }

    pageEl(page, number) {
        const el = document.createElement("section");
        el.className = `binder-page is-${page.kind}`;
        const deck = this.deckManager;

        if (page.kind === "cover") {
            const owned = deck.opened.reduce((n, set) => n + setCards(set).length, 0);
            const all = CONFIG.SETS.reduce((n, set) => n + setCards(set).length, 0);
            el.innerHTML = `
                <span class="cover-eyebrow">TCG Portfolio</span>
                <span class="cover-title">Collection</span>
                <span class="cover-count">${owned} / ${all} cards · ${CONFIG.SETS.length} sets</span>`;
            return el;
        }
        if (page.kind === "back" || page.kind === "verso") return el;

        const { set, cards } = page;
        const open = deck.has(set);
        el.style.setProperty("--set-color", set.booster.color);
        el.style.setProperty("--set-highlight", set.booster.highlight);

        if (page.kind === "divider") {
            const series = String(CONFIG.SETS.indexOf(set) + 1).padStart(2, "0");
            el.innerHTML = `
                <span class="divider-code"></span>
                <span class="divider-series">Series ${series}</span>
                <h2 class="divider-name"></h2>
                <span class="divider-state"></span>`;
            el.querySelector(".divider-code").textContent = set.code;
            el.querySelector(".divider-name").textContent = set.name;
            const state = el.querySelector(".divider-state");
            state.textContent = open
                ? `${cards.length} / ${cards.length} collected`
                : `Sealed · ${cards.length} cards`;
            if (!open) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "divider-open";
                btn.dataset.open = set.id;
                btn.textContent = "Open the booster";
                state.append(btn);
            }
            return el;
        }

        const head = document.createElement("header");
        head.className = "sheet-head";
        head.innerHTML = "<h2></h2><span></span>";
        head.querySelector("h2").textContent = set.name;
        head.querySelector("span").textContent = set.code;

        const grid = document.createElement("div");
        grid.className = "pockets";
        for (let i = page.from; i < page.from + POCKETS; i++) {
            grid.append(this.pocket(set, cards, i, open));
        }

        const foot = document.createElement("span");
        foot.className = "sheet-number";
        foot.textContent = number;
        el.append(head, grid, foot);
        return el;
    }

    pocket(set, cards, i, open) {
        if (i >= cards.length) {
            const empty = document.createElement("div");
            empty.className = "pocket is-empty";
            return empty;
        }
        if (!open) {
            // A mystery card: the set is sealed, but the pocket shows something waits there.
            const mystery = document.createElement("div");
            mystery.className = "pocket is-mystery";
            mystery.setAttribute("aria-hidden", "true");
            mystery.innerHTML = "<b>?</b>";
            return mystery;
        }
        const data = cards[i];
        const pocket = document.createElement("button");
        pocket.type = "button";
        pocket.className = "pocket";
        pocket.dataset.set = set.id;
        pocket.dataset.index = i;
        pocket.setAttribute("aria-label", `${data.header.name}, ${data.setLabel}`);

        const card = document.createElement("tcg-card");
        card.setAttribute("thumbnail", "");
        // Everything inside a thumbnail is decoration: the pocket is the button.
        card.inert = true;
        card.data = data;
        pocket.append(card);
        this.thumbs.set(String(data.id), card);
        return pocket;
    }

    buildTabs() {
        const tabs = CONFIG.SETS.map((set) => {
            const at = this.pages.findIndex((p) => p.kind === "divider" && p.set === set);
            const open = this.deckManager.has(set);
            const tab = document.createElement("button");
            tab.type = "button";
            tab.className = "binder-tab";
            tab.dataset.page = at;
            tab.dataset.set = set.id;
            tab.style.setProperty("--set-color", set.booster.highlight);
            tab.classList.toggle("is-sealed", !open);
            tab.setAttribute("aria-label", `${set.name}${open ? "" : ", sealed"}`);
            tab.append(icon(open ? set.icon : "lock"));
            const name = document.createElement("span");
            name.textContent = this.mode === "spread" ? set.name : set.code;
            tab.append(name);
            return tab;
        });
        this.tabsRoot.replaceChildren(...tabs);
    }

    /* ---------- Turning ---------- */

    /** Show leaf `index`: every leaf before it turned over, the others still to read. */
    show(index, animate = true, turning = null) {
        const count = this.leaves.length;
        this.turned = clamp(index, 0, count - 1);
        this.leaves.forEach((leaf, j) => {
            const over = j < this.turned;
            leaf.classList.toggle("no-transition", !animate);
            leaf.style.setProperty("--flip", over ? 1 : 0);
            leaf.style.zIndex = leaf === turning ? 3 * count : over ? j + 1 : 2 * count - j;

            // Only the faces on screen can be reached.
            const [front, back] = leaf.children;
            front.inert = j !== this.turned;
            back.inert = !(this.mode === "spread" && j === this.turned - 1);
        });
        if (!animate) {
            void this.book.offsetWidth;
            this.leaves.forEach((leaf) => leaf.classList.remove("no-transition"));
        }
        // Above every leaf lying flat, under the one turning (3 * count), which passes over.
        this.rings.style.zIndex = 2 * count + 1;
        if (turning) {
            setTimeout(() => {
                turning.style.zIndex =
                    this.leaves.indexOf(turning) < this.turned
                        ? this.leaves.indexOf(turning) + 1
                        : 2 * count - this.leaves.indexOf(turning);
            }, TURN_DURATION);
        }

        this.root.classList.toggle("is-open-book", this.turned > 0);
        this.pageLabel.textContent = `${this.turned + 1} / ${count}`;
        const current = this.currentSet();
        this.tabsRoot.querySelectorAll(".binder-tab").forEach((tab) =>
            tab.setAttribute("aria-current", String(tab.dataset.set === current?.id))
        );
    }

    /** Set of the page on the right (spread) or on screen (single). */
    currentSet() {
        const at = this.mode === "spread" ? 2 * this.turned : this.turned;
        return (this.pages[at] || this.pages[at - 1])?.set;
    }

    turn(direction) {
        const next = this.turned + direction;
        if (next < 0 || next >= this.leaves.length) return;
        const leaf = this.leaves[direction > 0 ? this.turned : next];
        this.show(next, true, leaf);
    }

    async jumpTo(at) {
        const target = this.leafOf(at);
        const direction = Math.sign(target - this.turned);
        while (direction && this.turned !== target) {
            this.turn(direction);
            await wait(JUMP_STEP);
        }
    }

    /* ---------- Drag ---------- */

    bindBook() {
        this.book.addEventListener("pointerdown", (e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            this.drag = { x: e.clientX, target: e.target, moved: false, dir: 0, leaf: null, p: 0 };
            this.book.setPointerCapture(e.pointerId);
        });
        this.book.addEventListener("pointermove", (e) => this.onDragMove(e));
        this.book.addEventListener("pointerup", () => this.onDragEnd());
        this.book.addEventListener("pointercancel", () => this.onDragEnd());
        // Keyboard: Enter or Space on a pocket or a button inside the book.
        this.book.addEventListener("click", (e) => {
            if (e.detail === 0) this.activate(e.target);
        });
    }

    // The page follows the pointer, from the spine side it is turning towards.
    onDragMove(e) {
        const drag = this.drag;
        if (!drag) return;
        const delta = e.clientX - drag.x;
        if (!drag.moved && Math.abs(delta) < TAP_DISTANCE) return;
        drag.moved = true;

        if (!drag.dir) {
            drag.dir = delta < 0 ? 1 : -1;
            const index = drag.dir > 0 ? this.turned : this.turned - 1;
            const canTurn = drag.dir > 0 ? this.turned < this.leaves.length - 1 : this.turned > 0;
            drag.leaf = canTurn ? this.leaves[index] : null;
            if (drag.leaf) {
                drag.leaf.classList.add("is-dragging");
                drag.leaf.style.zIndex = 3 * this.leaves.length;
            }
        }
        if (!drag.leaf) return;

        const span = this.book.clientWidth / (this.mode === "spread" ? 2 : 1);
        drag.p = clamp((drag.dir > 0 ? -delta : delta) / span, 0, 1);
        drag.leaf.style.setProperty("--flip", drag.dir > 0 ? drag.p : 1 - drag.p);
    }

    onDragEnd() {
        const drag = this.drag;
        if (!drag) return;
        this.drag = null;

        if (!drag.moved) {
            if (this.activate(drag.target)) return;
            // A tap on the right half turns forward, on the left half back.
            const box = this.book.getBoundingClientRect();
            this.turn(drag.x > box.left + box.width / 2 ? 1 : -1);
            return;
        }
        if (!drag.leaf) return;
        drag.leaf.classList.remove("is-dragging");
        const next = drag.p > TURN_THRESHOLD ? this.turned + drag.dir : this.turned;
        this.show(next, true, drag.leaf);
    }

    /** A pocket or a button of the book was picked. @returns {boolean} Whether it was one. */
    activate(target) {
        const open = target.closest("[data-open]");
        if (open) {
            this.close();
            document.dispatchEvent(
                new CustomEvent("open-booster", { detail: { id: open.dataset.open } })
            );
            return true;
        }
        const pocket = target.closest(".pocket[data-set]");
        if (pocket) {
            const set = CONFIG.SETS.find((s) => s.id === pocket.dataset.set);
            this.close();
            this.deckManager.showCard(set, Number(pocket.dataset.index));
            return true;
        }
        return false;
    }
}
