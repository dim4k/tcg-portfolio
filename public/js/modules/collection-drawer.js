import { CONFIG } from "../config.js";
import { setCards } from "./card-renderer.js";
import { packMarkup, packStyle } from "./booster-pack.js";
import { Collection } from "./collection.js";

/**
 * The collection drawer, opened from the toolbar: one tile per set of CONFIG.SETS, with its
 * pack and how many of its cards are owned. An opened set narrows the deck to its cards; a
 * sealed one opens its booster. The toolbar button names the set the deck is narrowed to and
 * counts the boosters still sealed.
 */
export class CollectionDrawer {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.button = document.getElementById("collection-btn");
        this.badge = document.getElementById("collection-badge");
        this.dialog = document.getElementById("collection-drawer");
        this.tiles = document.getElementById("collection-tiles");
        this.summary = document.getElementById("collection-summary");

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
            const tile = e.target.closest(".collection-tile");
            if (tile) this.pick(tile);
        });
        this.bindReset();
        document.addEventListener("deck-cards-change", () => this.syncButton());
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

    syncButton() {
        const deck = this.deckManager;
        const sealed = CONFIG.SETS.length - deck.opened.length;
        this.badge.hidden = sealed === 0 || deck.opened.length === 0;
        this.badge.textContent = sealed;

        const set = CONFIG.SETS.find((s) => s.id === deck.filter);
        this.button.querySelector(".toolbar-label").textContent = set ? set.name : "Collection";
        this.button.classList.toggle("is-filtered", Boolean(set));
        this.button.style.setProperty("--set-color", set ? set.booster.highlight : "");
        this.button.setAttribute(
            "aria-label",
            set ? `Collection, showing ${set.name} only` : "Collection"
        );
    }

    render() {
        const deck = this.deckManager;
        const owned = deck.opened.reduce((n, set) => n + setCards(set).length, 0);
        this.summary.textContent = `${owned} cards · ${deck.opened.length} / ${CONFIG.SETS.length} sets opened`;

        const all = document.createElement("button");
        all.type = "button";
        all.className = "collection-tile is-all";
        all.dataset.filter = "all";
        all.setAttribute("aria-current", String(deck.filter === "all"));
        all.innerHTML = `
            <span class="collection-stack">${owned}</span>
            <b>All cards</b>
            <small>${deck.opened.length} sets</small>`;

        const tiles = CONFIG.SETS.map((set) => {
            const count = setCards(set).length;
            const open = deck.has(set);
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
                <span class="collection-bar"><i style="width: ${open ? 100 : 0}%"></i></span>
                <small>${open ? `${count} / ${count}` : `Sealed · ${count} cards`}</small>`;
            tile.querySelector("b").textContent = set.name;
            tile.setAttribute(
                "aria-label",
                open ? `${set.name}, ${count} cards: show only these` : `${set.name}, sealed: open its booster`
            );
            return tile;
        });

        this.tiles.replaceChildren(all, ...tiles);
    }
}
