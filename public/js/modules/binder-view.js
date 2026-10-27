import { CONFIG } from "../config.js";
import { icon } from "./icons.js";
import { setCards } from "./card-renderer.js";
import { packMarkup, packStyle } from "./booster-pack.js";
import { followPointer, grabFromControl, isThrow, pressedControl } from "./card-drag.js";
import { resetTilt } from "./interactions.js";
import { Utils } from "./utils.js";
import { Collection } from "./collection.js";
import { localizeSet, t } from "../i18n.js";

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
const ROOM_TABS = 150;
const GUTTER = 16;
// A dragged page turns once pulled past this share of its width.
const TURN_THRESHOLD = 0.3;
// Must match the .leaf transition in binder.css.
const TURN_DURATION = 800;
const JUMP_STEP = 110;
// The tabs come back out a little before the page has fully landed.
const TABS_BACK = TURN_DURATION - 150;
// Pointer travel (px) under which a press on the book is a tap.
const TAP_DISTANCE = 8;
// A card taken out of its pocket: flight between the pocket and the middle of the screen,
// flight off screen when thrown away, and the bounce of its pocket taking it back.
const PEEK_FLIGHT = 520;
const THROW_FLIGHT = 450;
const POCKET_BOUNCE = 380;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * The binder: a book whose pages turn with a drag or a tap. A cover, then for each set of
 * CONFIG.SETS a divider page and as many sheets of nine pockets as its cards need. Two pages
 * side by side on wide screens, one on narrow ones. Sets still sealed show mystery pockets and
 * a button to open their booster; picking a card takes it out of its pocket, to look at it or
 * send it to the front of the deck.
 */
export class BinderView {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.root = document.getElementById("binder");
        this.toggleBtn = document.getElementById("view-toggle-btn");
        this.boostersBtn = document.getElementById("binder-boosters");
        this.book = document.getElementById("binder-book");
        this.tabsRoot = document.getElementById("binder-tabs");
        this.pageLabel = document.getElementById("binder-page");
        this.stage = this.root.querySelector(".binder-stage");
        this.nav = this.root.querySelector(".binder-nav");
        this.peekEl = document.getElementById("binder-peek");
        this.peekSlot = document.getElementById("binder-peek-card");
        this.toolbar = document.querySelector(".toolbar");
        // The card out of its pocket: { pocket, set, index, card }, and the drag holding it.
        this.peeking = null;
        this.peekDrag = null;
        this.pages = [];
        this.leaves = [];
        this.thumbs = new Map();
        this.mode = null;
        // Leaves turned over to the left: the visible page is leaf `turned`.
        this.turned = 0;
        this.drag = null;
        // Until when leaves may still be turning, and the frame keeping their order meanwhile.
        this.settleAt = 0;
        this.stackFrame = null;
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
            this.syncBoosters();
        });
        // Seen cards lose their "new" mark, and seeing them all brings the secret set in. While
        // the binder is open, the pocket taken out updates itself (peek): no rebuild under it.
        document.addEventListener("card-seen", () => {
            if (!this.isOpen) this.stale = true;
        });
        document.addEventListener("collection-complete", () => {
            this.stale = true;
            this.syncBoosters();
        });
        // No set named: the booster opens on the pick among the sealed ones, or the last one.
        this.boostersBtn.addEventListener("click", () =>
            document.dispatchEvent(new CustomEvent("open-booster", { detail: {} }))
        );
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
        this.bindPeek();
        this.syncBoosters();
    }

    /** @param {string} [setId] Open on that set's divider page. */
    open(setId) {
        this.dropPeek();
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
        this.dropPeek();
        this.isOpen = false;
        // The counts on the cover and the dividers may have moved with the cards looked at.
        this.stale = true;
        this.root.hidden = true;
        this.deckManager.setBinderOpen(false);
        this.syncToggle();
        this.toggleBtn.focus();
    }

    /** The toolbar reminder of the boosters still sealed, shown in the binder view only. */
    syncBoosters() {
        const sealed = Collection.sets().filter((set) => !this.deckManager.has(set));
        this.boostersBtn.hidden = sealed.length === 0;
        if (!sealed.length) return;
        this.boostersBtn.querySelector(".collection-badge").textContent = sealed.length;
        this.boostersBtn.setAttribute(
            "aria-label",
            sealed.length > 1
                ? t("dock.openSeveral", { n: sealed.length })
                : t("dock.openOne", { name: localizeSet(sealed[0]).name })
        );
        this.boostersBtn.querySelector(".booster-btn-packs").replaceChildren(
            ...sealed.slice(0, 2).map((set) => {
                const mini = document.createElement("span");
                mini.className = "pack-mini";
                mini.dataset.pack = set.id;
                mini.style.cssText = packStyle(set);
                mini.innerHTML = packMarkup(set);
                return mini;
            })
        );
    }

    syncToggle() {
        const state = this.isOpen
            ? CONFIG.VIEW_TOGGLE.binder
            : CONFIG.VIEW_TOGGLE.deck;
        this.toggleBtn.querySelector("svg")?.replaceWith(icon(state.icon));
        this.toggleBtn.querySelector("span").textContent = t(state.label);
        this.toggleBtn.setAttribute("aria-pressed", String(this.isOpen));
    }

    onKeydown(e) {
        if (!this.isOpen) return;
        if (this.peeking) {
            if (e.key === "Escape") this.putBack();
            return;
        }
        if (e.key === "Escape") this.close();
        else if (e.key === "ArrowRight") this.turn(1);
        else if (e.key === "ArrowLeft") this.turn(-1);
    }

    /* ---------- Pages ---------- */

    /** The cover, then each set: its divider and as many sheets as its cards need. */
    listPages() {
        const pages = [{ kind: "cover" }];
        Collection.sets().forEach((set) => {
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
        this.book.replaceChildren(...this.leaves);

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
            el.innerHTML = `
                <span class="cover-spine"></span>
                <span class="cover-eyebrow">TCG Portfolio</span>
                <span class="cover-title"></span>
                <span class="cover-count"></span>`;
            el.querySelector(".cover-title").textContent = t("binder.cover");
            el.querySelector(".cover-count").textContent = t("binder.coverCount", {
                ...Collection.progress(),
                n: Collection.sets().length,
            });
            return el;
        }
        if (page.kind === "back" || page.kind === "verso") return el;

        const { set, cards } = page;
        const open = deck.has(set);
        const { name } = localizeSet(set);
        el.style.setProperty("--set-color", set.booster.color);
        el.style.setProperty("--set-highlight", set.booster.highlight);

        if (page.kind === "divider") {
            const series = String(CONFIG.SETS.indexOf(set) + 1).padStart(2, "0");
            el.innerHTML = `
                <span class="divider-code"></span>
                <span class="divider-series"></span>
                <h2 class="divider-name"></h2>
                <span class="divider-state"></span>`;
            el.querySelector(".divider-code").textContent = set.code;
            el.querySelector(".divider-series").textContent = t("binder.series", { n: series });
            el.querySelector(".divider-name").textContent = name;
            const state = el.querySelector(".divider-state");
            state.textContent = open
                ? t("binder.dividerSeen", { seen: Collection.seenIn(set), total: cards.length })
                : t("binder.dividerSealed", { n: cards.length });
            if (!open) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "divider-open";
                btn.dataset.open = set.id;
                btn.textContent = t("binder.openBooster");
                state.append(btn);
            } else if (!set.secret) {
                // The link to this set alone (deep-link.js); a secret one would open nothing.
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "divider-share";
                btn.dataset.share = set.id;
                btn.dataset.title = name;
                btn.setAttribute("aria-label", t("collection.share", { name }));
                btn.append(icon("share-nodes"), ` ${t("binder.share")}`);
                state.append(btn);
            }
            return el;
        }

        const head = document.createElement("header");
        head.className = "sheet-head";
        head.innerHTML = "<h2></h2><span></span>";
        head.querySelector("h2").textContent = name;
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
        // Never looked at yet: a "new" mark on the sleeve, until it is.
        const unseen = !Collection.hasSeen(data.slug);
        pocket.classList.toggle("is-new", unseen);
        pocket.setAttribute(
            "aria-label",
            unseen
                ? t("binder.pocketNew", { name: data.header.name, number: data.setLabel })
                : `${data.header.name}, ${data.setLabel}`
        );
        if (unseen) {
            const mark = document.createElement("span");
            mark.className = "pocket-new";
            mark.setAttribute("aria-hidden", "true");
            mark.textContent = t("binder.new");
            pocket.append(mark);
        }

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
        const tabs = Collection.sets().map((set) => {
            const at = this.pages.findIndex((p) => p.kind === "divider" && p.set === set);
            const open = this.deckManager.has(set);
            const { name: setName } = localizeSet(set);
            const tab = document.createElement("button");
            tab.type = "button";
            tab.className = "binder-tab";
            tab.dataset.page = at;
            tab.dataset.set = set.id;
            tab.style.setProperty("--set-color", set.booster.highlight);
            // Rank, for the tabs coming back out one after the other.
            tab.style.setProperty("--i", CONFIG.SETS.indexOf(set));
            tab.classList.toggle("is-sealed", !open);
            tab.setAttribute("aria-label", open ? setName : t("binder.tabSealed", { name: setName }));
            tab.append(icon(open ? set.icon : "lock"));
            const name = document.createElement("span");
            name.textContent = this.mode === "spread" ? setName : set.code;
            tab.append(name);
            return tab;
        });
        this.tabsRoot.replaceChildren(...tabs);
    }

    /* ---------- Turning ---------- */

    /** Show leaf `index`: every leaf before it turned over, the others still to read. */
    show(index, animate = true) {
        const count = this.leaves.length;
        const before = this.visibleFaces();
        this.turned = clamp(index, 0, count - 1);
        const still = new Set();
        this.leaves.forEach((leaf, j) => {
            const flip = j < this.turned ? 1 : 0;
            if (Number(leaf.style.getPropertyValue("--flip")) === flip) still.add(leaf);
            leaf.classList.toggle("no-transition", !animate);
            leaf.style.setProperty("--flip", flip);

            // Only the faces on screen can be reached.
            const [front, back] = leaf.children;
            front.inert = j !== this.turned;
            back.inert = !(this.mode === "spread" && j === this.turned - 1);
        });
        if (!animate) {
            void this.book.offsetWidth;
            this.leaves.forEach((leaf) => leaf.classList.remove("no-transition"));
        }
        this.stack(animate ? TURN_DURATION : 0);
        if (animate) this.tuckTabs(TABS_BACK);

        // A page uncovered by the one turning away comes out of its shadow, into focus.
        if (animate && !Utils.prefersReducedMotion()) {
            this.visibleFaces()
                .filter((face) => !before.includes(face) && still.has(face.parentElement))
                .forEach((face) =>
                    face.firstElementChild.animate(
                        [{ filter: "blur(2.5px) brightness(0.7)" }, { filter: "none" }],
                        { duration: TURN_DURATION, easing: "cubic-bezier(.4,0,.2,1)" }
                    )
                );
        }

        this.root.classList.toggle("is-open-book", this.turned > 0);
        this.pageLabel.textContent = `${this.turned + 1} / ${count}`;
        const current = this.currentSet();
        this.tabsRoot.querySelectorAll(".binder-tab").forEach((tab) =>
            tab.setAttribute("aria-current", String(tab.dataset.set === current?.id))
        );
    }

    /**
     * The tabs tuck in behind the book while pages turn, and come back out once they have
     * landed: a run of turns (a jump to a tab) keeps them in until the last one.
     * @param {number|null} ms How long until they come out; null keeps them in (a drag).
     */
    tuckTabs(ms) {
        if (Utils.prefersReducedMotion()) return;
        this.root.classList.add("is-flipping");
        clearTimeout(this.tabsTimer);
        if (ms === null) return;
        this.tabsTimer = setTimeout(() => this.root.classList.remove("is-flipping"), ms);
    }

    /** The faces on screen: the right page, and the left one in a spread. */
    visibleFaces() {
        const faces = [this.leaves[this.turned]?.children[0]];
        if (this.mode === "spread") faces.push(this.leaves[this.turned - 1]?.children[1]);
        return faces.filter(Boolean);
    }

    /**
     * Order the leaves from how far each has turned: on either side of the spine, the leaf
     * closest to the reader on top. Kept up to date on every frame while pages turn, so a
     * leaf crossing the spine goes from the top of one pile to the top of the other.
     * @param {number} duration How long the leaves may keep turning (ms).
     */
    stack(duration = 0) {
        this.settleAt = Math.max(this.settleAt, performance.now() + duration);
        if (this.stackFrame) return;
        const frame = () => {
            const count = this.leaves.length;
            this.leaves.forEach((leaf, j) => {
                const flip = Number(getComputedStyle(leaf).getPropertyValue("--flip")) || 0;
                leaf.style.zIndex = flip < 0.5 ? count - j : count + j;
                leaf.classList.toggle("is-turning", flip > 0.001 && flip < 0.999);
            });
            const moving = this.drag?.leaf || performance.now() < this.settleAt;
            this.stackFrame = moving ? requestAnimationFrame(frame) : null;
        };
        frame();
    }

    /** Set of the page on the right (spread) or on screen (single). */
    currentSet() {
        const at = this.mode === "spread" ? 2 * this.turned : this.turned;
        return (this.pages[at] || this.pages[at - 1])?.set;
    }

    turn(direction) {
        const next = this.turned + direction;
        if (next < 0 || next >= this.leaves.length) return;
        this.show(next);
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
                this.stack();
                this.tuckTabs(null);
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
        this.show(next);
    }

    /** A pocket or a button of the book was picked. @returns {boolean} Whether it was one. */
    activate(target) {
        const share = target.closest("[data-share]");
        if (share) {
            document.dispatchEvent(
                new CustomEvent("share-link", {
                    detail: { hash: share.dataset.share, title: share.dataset.title },
                })
            );
            return true;
        }
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
            this.peek(pocket);
            return true;
        }
        return false;
    }

    /* ---------- A card out of its pocket ---------- */

    bindPeek() {
        this.peekEl.addEventListener("click", (e) => {
            const action = e.target.closest("[data-peek]")?.dataset.peek;
            if (action === "deck") this.showInDeck();
            else if (action === "back" || e.target === this.peekEl) this.putBack();
        });
        // The card handles like the front card of the deck: it leans towards the pointer or
        // the phone's tilt (interactions.js), a tap turns it over, and a throw sends it away,
        // back to the binder. Its links and buttons keep their own click, unless dragged.
        this.peekSlot.addEventListener("pointerdown", (e) => this.onPeekDown(e));
        this.peekSlot.addEventListener("pointermove", (e) => this.onPeekMove(e));
        this.peekSlot.addEventListener("pointerup", (e) => this.onPeekUp(e));
        this.peekSlot.addEventListener("pointercancel", () => this.onPeekUp(null));
    }

    onPeekDown(e) {
        const card = this.peeking?.card;
        if (!card || this.peeking.leaving || this.peekDrag?.moving) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const control = pressedControl(e);
        this.peekDrag = {
            control,
            pointerId: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            dx: 0,
            dy: 0,
            t: e.timeStamp,
            vx: 0,
            vy: 0,
            moving: false,
        };
        if (!control) card.setPointerCapture(e.pointerId);
    }

    onPeekMove(e) {
        const drag = this.peekDrag;
        if (!drag || e.pointerId !== drag.pointerId) return;
        const card = this.peeking.card;
        if (!drag.moving) {
            const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
            if (moved < CONFIG.DRAG_START_DISTANCE) return;
            drag.moving = true;
            if (drag.control) grabFromControl(card, drag.pointerId);
            // Held: the light stops following the pointer.
            this.deckManager.isDragging = true;
            card.classList.add("is-dragging");
            card.setLight({ glare: 0 });
        }
        card.style.transform = followPointer(drag, e);
    }

    /** @param {PointerEvent|null} e Null when the browser took the pointer away. */
    onPeekUp(e) {
        const drag = this.peekDrag;
        if (!drag || (e && e.pointerId !== drag.pointerId)) return;
        this.peekDrag = null;
        const card = this.peeking?.card;
        if (!card) return;
        if (!drag.moving) {
            if (e && card.hasBack && !drag.control) card.toggleFlip();
            return;
        }
        this.deckManager.isDragging = false;
        card.classList.remove("is-dragging");
        if (e && isThrow(drag, e.timeStamp)) this.throwPeek(drag.dx, drag.dy);
        else card.style.transform = "";
    }

    /** Thrown away: the card flies off screen, and the binder shows again, the card in its pocket. */
    async throwPeek(dx, dy) {
        const peeking = this.peeking;
        peeking.leaving = true;
        this.deckManager.peekCard = null;
        this.peekEl.classList.add("is-leaving");
        const { card, pocket } = peeking;
        if (!Utils.prefersReducedMotion()) {
            const dist = Math.hypot(dx, dy) || 1;
            const reach = Math.hypot(window.innerWidth, window.innerHeight);
            const away = `translate3d(${(dx / dist) * reach}px, ${(dy / dist) * reach}px, 0) rotate(${(dx / dist) * 30}deg)`;
            await card
                .animate([{ transform: card.style.transform || "none" }, { transform: away }], {
                    duration: THROW_FLIGHT,
                    easing: "cubic-bezier(.3,.6,.4,1)",
                    fill: "forwards",
                })
                .finished.catch(() => {});
        }
        if (this.peeking !== peeking) return;
        this.dropPeek();
        pocket.focus({ preventScroll: true });
        // The pocket takes its card back with a little bounce, so the eye finds it.
        if (!Utils.prefersReducedMotion()) {
            pocket.animate([{ transform: "scale(1.08)" }, { transform: "none" }], {
                duration: POCKET_BOUNCE,
                easing: "cubic-bezier(.3,1.5,.5,1)",
            });
        }
    }

    /** Take the card of `pocket` out: it flies up to the middle of the screen, full size. */
    peek(pocket) {
        if (this.peeking) return;
        const set = CONFIG.SETS.find((s) => s.id === pocket.dataset.set);
        const index = Number(pocket.dataset.index);
        const card = document.createElement("tcg-card");
        // The front card of its own little deck: it gets the hover effects of one.
        card.dataset.pos = "0";
        card.data = setCards(set)[index];
        this.peekSlot.replaceChildren(card);
        const peeking = { pocket, set, index, card };
        this.peeking = peeking;

        this.peekEl.hidden = false;
        // A modal: nothing behind it takes focus, the toolbar included.
        this.stage.inert = true;
        this.nav.inert = true;
        this.toolbar.inert = true;
        pocket.classList.add("is-out");
        // Taken out of its pocket: it counts as seen, and its sleeve loses the "new" mark.
        Collection.markSeen(card.data.slug);
        pocket.classList.remove("is-new");
        pocket.querySelector(".pocket-new")?.remove();
        pocket.setAttribute("aria-label", `${card.data.header.name}, ${card.data.setLabel}`);
        this.peekEl.querySelector('[data-peek="deck"]').focus({ preventScroll: true });
        // Once it has landed, it answers the pointer and the gyroscope like the front card.
        this.flyPeek(pocket, false).then(() => {
            if (this.peeking === peeking && !peeking.leaving) this.deckManager.peekCard = card;
        });
    }

    /** The card goes back into its pocket. */
    async putBack() {
        const peeking = this.peeking;
        if (!peeking || peeking.leaving) return;
        peeking.leaving = true;
        this.deckManager.peekCard = null;
        resetTilt(peeking.card);
        await this.flyPeek(peeking.pocket, true);
        if (this.peeking !== peeking) return;
        this.dropPeek();
        peeking.pocket.focus({ preventScroll: true });
    }

    showInDeck() {
        const { set, index } = this.peeking;
        this.close();
        this.deckManager.showCard(set, index);
    }

    /** Hide the card out of its pocket at once, if any. */
    dropPeek() {
        if (!this.peeking) return;
        this.peeking.pocket.classList.remove("is-out");
        this.peeking = null;
        this.peekDrag = null;
        this.deckManager.peekCard = null;
        this.deckManager.isDragging = false;
        this.peekEl.hidden = true;
        this.peekEl.classList.remove("is-leaving");
        this.peekSlot.getAnimations().forEach((anim) => anim.cancel());
        this.peekSlot.replaceChildren();
        this.stage.inert = false;
        this.nav.inert = false;
        this.toolbar.inert = false;
    }

    /** Fly the card between its pocket and the middle of the screen. */
    flyPeek(pocket, back) {
        this.peekEl.classList.toggle("is-leaving", back);
        if (Utils.prefersReducedMotion()) return Promise.resolve();
        const from = pocket.getBoundingClientRect();
        const to = this.peekSlot.getBoundingClientRect();
        const dx = from.left + from.width / 2 - (to.left + to.width / 2);
        const dy = from.top + from.height / 2 - (to.top + to.height / 2);
        const inPocket = `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`;
        // Out: pulled up out of the sleeve with a slight swing, then settling flat. Back: a
        // little lift first, then it heads for the pocket at once and slows as it slides in.
        const frames = back
            ? [
                  { transform: "none" },
                  { transform: "translateY(-2%) rotate(2deg) scale(1.03)", offset: 0.15 },
                  { transform: inPocket },
              ]
            : [
                  { transform: inPocket },
                  { transform: "translateY(-3%) rotate(-2deg) scale(1.03)", offset: 0.7 },
                  { transform: "none" },
              ];
        return this.peekSlot
            .animate(frames, {
                duration: PEEK_FLIGHT,
                easing: back ? "cubic-bezier(.45,.05,.3,1)" : "cubic-bezier(.2,.8,.25,1)",
                fill: "forwards",
            })
            .finished.then(
                (anim) => back || anim.cancel(),
                () => {}
            );
    }
}
