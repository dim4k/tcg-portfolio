import { CONFIG } from "../config.js";
import { setCards } from "./card-renderer.js";
import { packMarkup, packStyle } from "./booster-pack.js";
import { Collection } from "./collection.js";
import { icon } from "./icons.js";
import { localizeSet, t } from "../i18n.js";

/**
 * The collection drawer, opened from the toolbar: one tile per set on offer
 * (Collection.sets()), with its pack and how many of its cards have been seen. An opened set
 * narrows the deck to its cards, and has a button sharing the link to it; a sealed one opens
 * its booster. The toolbar button names the set the deck is narrowed to (its code on a phone);
 * while a booster is revealed, its badge counts the cards it catches (the sealed boosters
 * have the dock).
 */
export class CollectionDrawer {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.button = document.getElementById("collection-btn");
        this.badge = document.getElementById("collection-badge");
        this.dialog = document.getElementById("collection-drawer");
        this.tiles = document.getElementById("collection-tiles");
        this.summary = document.getElementById("collection-summary");
        this.goal = document.getElementById("collection-goal");

        this.button.addEventListener("click", () => this.open());
        this.dialog
            .querySelector(".collection-close")
            .addEventListener("click", () => this.dialog.close());
        this.dialog.addEventListener("click", (e) => {
            // A click on the backdrop lands on the dialog element itself.
            if (e.target === this.dialog) {
                this.dialog.close();
                return;
            }
            const share = e.target.closest(".collection-share");
            if (share) {
                document.dispatchEvent(
                    new CustomEvent("share-link", {
                        detail: { hash: share.dataset.share, title: share.dataset.title },
                    })
                );
                return;
            }
            const tile = e.target.closest(".collection-tile");
            if (tile) this.pick(tile);
        });
        this.bindReset();
        document.addEventListener("deck-cards-change", () => this.syncButton());
        document.addEventListener("collection-catch", (e) => this.catchCard(e.detail.count));
        this.syncButton();
    }

    // A quiet link at the bottom of the drawer, then a confirmation in its place.
    bindReset() {
        this.resetBtn = document.getElementById("collection-reset");
        this.confirm = document.getElementById("collection-confirm");
        this.resetBtn.addEventListener("click", () => this.askReset(true));
        this.confirm.addEventListener("click", (e) => {
            const choice = e.target.closest("[data-reset]")?.dataset.reset;
            if (choice === "confirm") Collection.reset();
            else if (choice === "cancel") this.askReset(false);
        });
        this.dialog.addEventListener("close", () => this.askReset(false));
    }

    askReset(asking) {
        this.resetBtn.hidden = asking;
        this.confirm.hidden = !asking;
        if (asking) this.confirm.querySelector('[data-reset="cancel"]').focus();
    }

    get isOpen() {
        return this.dialog.open;
    }

    open() {
        if (this.deckManager.isAnimating) return;
        this.render();
        this.dialog.showModal();
        this.tiles.querySelector('[aria-current="true"]')?.focus();
    }

    pick(tile) {
        this.dialog.close();
        if (tile.dataset.open) {
            document.dispatchEvent(
                new CustomEvent("open-booster", { detail: { id: tile.dataset.open } })
            );
        } else {
            this.deckManager.setFilter(tile.dataset.filter);
        }
    }

    /** A card of the booster being revealed flew in: the button gives, the badge counts it. */
    catchCard(count) {
        this.badge.hidden = false;
        this.badge.textContent = `+${count}`;
        [this.badge, this.button].forEach((el) => el.classList.remove("is-incoming", "is-catching"));
        void this.button.offsetWidth;
        this.badge.classList.add("is-incoming");
        this.button.classList.add("is-catching");
    }

    syncButton() {
        const deck = this.deckManager;
        this.badge.classList.remove("is-incoming");
        this.button.classList.remove("is-catching");
        this.badge.hidden = true;

        const set = CONFIG.SETS.find((s) => s.id === deck.filter);
        const name = set && localizeSet(set).name;
        this.button.querySelector(".toolbar-label").textContent = set ? name : t("collection.title");
        // A set's name would not fit a phone's toolbar: it shows its code (responsive.css).
        this.button.querySelector(".toolbar-code").textContent = set ? set.code : "";
        this.button.classList.toggle("is-filtered", Boolean(set));
        this.button.style.setProperty("--set-color", set ? set.booster.highlight : "");
        this.button.setAttribute(
            "aria-label",
            set ? t("collection.buttonFiltered", { name }) : t("collection.title")
        );
    }

    render() {
        const deck = this.deckManager;
        const owned = deck.opened.reduce((n, set) => n + setCards(set).length, 0);
        const progress = Collection.progress();
        const complete = Collection.isComplete();
        this.summary.textContent = t("collection.summary", progress);
        // What the progress leads to: a secret booster, then nothing more to find.
        this.goal.textContent = complete
            ? t("collection.complete")
            : t("collection.unlockHint", { total: progress.total });
        this.goal.classList.toggle("is-done", complete);

        const all = document.createElement("button");
        all.type = "button";
        all.className = "collection-tile is-all";
        all.dataset.filter = "all";
        all.setAttribute("aria-current", String(deck.filter === "all"));
        all.innerHTML = `
            <span class="collection-stack">${owned}</span>
            <b></b>
            <small></small>`;
        all.querySelector("b").textContent = t("collection.all");
        all.querySelector("small").textContent = t("collection.sets", { n: deck.opened.length });

        const tiles = Collection.sets().map((set) => {
            const count = setCards(set).length;
            const seen = Collection.seenIn(set);
            const open = deck.has(set);
            const { name } = localizeSet(set);
            const tile = document.createElement("button");
            tile.type = "button";
            tile.className = "collection-tile";
            tile.style.setProperty("--set-color", set.booster.highlight);
            if (open) {
                tile.dataset.filter = set.id;
                tile.setAttribute("aria-current", String(deck.filter === set.id));
            } else {
                tile.dataset.open = set.id;
                tile.classList.add("is-sealed");
            }
            tile.innerHTML = `
                <span class="pack-mini" data-pack="${set.id}" style="${packStyle(set)}">${packMarkup(set)}</span>
                <b></b>
                <span class="collection-bar"><i style="width: ${open ? (seen / count) * 100 : 0}%"></i></span>
                <small></small>`;
            tile.querySelector("b").textContent = name;
            tile.querySelector("small").textContent = open
                ? t("collection.tileSeen", { seen, total: count })
                : t("collection.tileSealed", { n: count });
            // Added since the last visit.
            if (!open && Collection.isNew(set)) {
                const ribbon = document.createElement("span");
                ribbon.className = "new-ribbon";
                ribbon.textContent = t("booster.new");
                tile.append(ribbon);
            }
            tile.setAttribute(
                "aria-label",
                open
                    ? t("collection.tileOpenLabel", { name, seen, total: count })
                    : t("collection.tileSealedLabel", { name })
            );
            // A link to the set alone (deep-link.js). Not a secret one: it would open nothing
            // for someone who has not unlocked it.
            if (!open || set.secret) return tile;
            const cell = document.createElement("div");
            cell.className = "collection-cell";
            const share = document.createElement("button");
            share.type = "button";
            share.className = "collection-share";
            share.dataset.share = set.id;
            share.dataset.title = name;
            share.setAttribute("aria-label", t("collection.share", { name }));
            share.title = t("collection.share", { name });
            share.append(icon("share-nodes"));
            cell.append(tile, share);
            return cell;
        });

        this.tiles.replaceChildren(all, ...tiles);
    }
}
