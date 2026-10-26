import { CONFIG } from "../config.js";

/**
 * The sets opened this session, kept in sessionStorage (CONFIG.BOOSTER_KEY) so a reload keeps
 * the same deck. Storage can be blocked: the collection then simply lasts until the reload.
 */
export const Collection = {
    /** @returns {object[]} Entries of CONFIG.SETS, in config order. */
    read() {
        let ids = [];
        try {
            ids = (sessionStorage.getItem(CONFIG.BOOSTER_KEY) || "").split(",");
        } catch {
            // Storage blocked.
        }
        return CONFIG.SETS.filter((set) => ids.includes(set.id));
    },

    /**
     * Start over: every booster sealed again. Reloads the page without its hash, so the
     * booster intro plays as on a first visit.
     */
    reset() {
        try {
            sessionStorage.removeItem(CONFIG.BOOSTER_KEY);
        } catch {
            // Storage blocked: the reload alone starts over.
        }
        window.location.replace(window.location.pathname + window.location.search);
    },

    /** @param {object[]} sets Entries of CONFIG.SETS. */
    save(sets) {
        try {
            sessionStorage.setItem(CONFIG.BOOSTER_KEY, sets.map((set) => set.id).join(","));
        } catch {
            // Storage blocked.
        }
    },
};
