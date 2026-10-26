import { CONFIG } from "../config.js";
import { setCards } from "./card-renderer.js";

/** A list of ids kept under `key` in localStorage, comma separated; null when never stored. */
function readList(key) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? null : value.split(",").filter(Boolean);
    } catch {
        return null; // Storage blocked.
    }
}

function writeList(key, ids) {
    try {
        localStorage.setItem(key, ids.join(","));
    } catch {
        // Storage blocked: it lasts until the reload.
    }
}

// Kept in memory too, so blocked storage still works for the visit.
let seen = new Set(readList(CONFIG.SEEN_KEY) || []);
let known = readList(CONFIG.KNOWN_KEY);

/**
 * The visitor's collection, kept in localStorage so it survives a new tab or a visit the next
 * day: the sets opened (CONFIG.BOOSTER_KEY), the cards seen (CONFIG.SEEN_KEY) and the sets
 * the visitor knew about (CONFIG.KNOWN_KEY). Storage can be blocked: the collection then
 * simply lasts until the reload.
 *
 * Seeing every card of the regular sets unlocks the `secret` ones: their booster shows up.
 */
export const Collection = {
    /** @returns {object[]} The opened entries of CONFIG.SETS, in config order. */
    read() {
        const ids = readList(CONFIG.BOOSTER_KEY) || [];
        return CONFIG.SETS.filter((set) => ids.includes(set.id));
    },

    /** @param {object[]} sets Entries of CONFIG.SETS. Opening a set makes it known. */
    save(sets) {
        writeList(CONFIG.BOOSTER_KEY, sets.map((set) => set.id));
        sets.forEach((set) => this.markKnown(set));
    },

    /**
     * Start over: every booster sealed again, every card unseen. Reloads the page without its
     * hash, so the booster intro plays as on a first visit.
     */
    reset() {
        try {
            localStorage.removeItem(CONFIG.BOOSTER_KEY);
            localStorage.removeItem(CONFIG.SEEN_KEY);
        } catch {
            // Storage blocked: the reload alone starts over.
        }
        window.location.replace(window.location.pathname + window.location.search);
    },

    /* ---------- Sets on offer ---------- */

    /**
     * The sets a visitor can see: the regular ones, and the secret ones once unlocked. One
     * opened stays, even if a set added later leaves cards to see again.
     */
    sets() {
        return CONFIG.SETS.filter((set) => this.isAvailable(set));
    },

    isAvailable(set) {
        return !set.secret || this.isComplete() || (readList(CONFIG.BOOSTER_KEY) || []).includes(set.id);
    },

    /* ---------- Cards seen ---------- */

    /** The cards a visitor has to see to unlock the secret sets. */
    regularCards() {
        return CONFIG.SETS.filter((set) => !set.secret).flatMap((set) => setCards(set));
    },

    hasSeen(slug) {
        return seen.has(slug);
    },

    /** How many cards of `set` have been seen. */
    seenIn(set) {
        return setCards(set).filter((card) => seen.has(card.slug)).length;
    },

    /** Cards of the regular sets seen, and how many there are. */
    progress() {
        const cards = this.regularCards();
        return { seen: cards.filter((card) => seen.has(card.slug)).length, total: cards.length };
    },

    isComplete() {
        const { seen: count, total } = this.progress();
        return count === total;
    },

    /**
     * A card was looked at. Listeners hear "card-seen" the first time, then
     * "collection-complete" if it was the last one missing.
     */
    markSeen(slug) {
        if (!slug || seen.has(slug)) return;
        const wasComplete = this.isComplete();
        seen.add(slug);
        writeList(CONFIG.SEEN_KEY, [...seen]);
        document.dispatchEvent(new CustomEvent("card-seen", { detail: { slug } }));
        if (!wasComplete && this.isComplete()) {
            document.dispatchEvent(new CustomEvent("collection-complete"));
        }
    },

    /* ---------- Sets new since the last visit ---------- */

    /**
     * On a first visit every set is known already: nothing is new to someone who has never
     * been here. Call once at startup.
     */
    initKnown() {
        if (known) return;
        known = CONFIG.SETS.map((set) => set.id);
        writeList(CONFIG.KNOWN_KEY, known);
    },

    /** Whether `set` was added since the visitor's last visit, and is still sealed. */
    isNew(set) {
        return Boolean(known) && !known.includes(set.id);
    },

    markKnown(set) {
        if (!known || known.includes(set.id)) return;
        known = [...known, set.id];
        writeList(CONFIG.KNOWN_KEY, known);
    },
};
