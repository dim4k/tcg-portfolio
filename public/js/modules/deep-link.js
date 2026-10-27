import { CONFIG } from "../config.js";
import { findSlug } from "./card-renderer.js";
import { Collection } from "./collection.js";
import { linkTo, shareLink } from "./share.js";

/**
 * antoine.kim/#projects opens the deck on the Projects card, #kimpay on a card of After Hours
 * (adding that set to the collection if needed), #after-hours on that whole set alone, and the
 * hash follows the card in front so the address bar is always a link to what is on screen. The
 * hash is replaced, not pushed: cycling five cards must not take five presses of Back to leave
 * the site. The share buttons (of a card, of a set) hand out these same links.
 */
export class DeepLink {
    /**
     * The set and card named by the current hash, or null. A set's id names the set itself
     * (`whole`), from its first card. A secret set stays secret until the visitor has
     * unlocked it: a link to it, or to its cards, opens nothing.
     */
    static fromHash() {
        const slug = decodeURIComponent(window.location.hash.slice(1));
        if (!slug) return null;
        const set = CONFIG.SETS.find((s) => s.id === slug);
        const target = findSlug(slug) || (set && { set, index: 0, whole: true });
        return target && Collection.isAvailable(target.set) ? target : null;
    }

    constructor(deckManager) {
        document.addEventListener("deck-change", (e) => {
            if (e.detail.initial) return;
            const slug = deckManager.cardData[e.detail.index]?.slug;
            if (slug && window.location.hash !== `#${slug}`) {
                history.replaceState(null, "", `#${slug}`);
            }
        });

        // A hash typed or pasted into the address bar of an open tab.
        window.addEventListener("hashchange", () => {
            const target = DeepLink.fromHash();
            if (!target) return;
            if (target.whole) deckManager.showSet(target.set);
            else deckManager.showCard(target.set, target.index);
        });

        // A share button: a card's (tcg-card.js), a set's (collection drawer, binder).
        document.addEventListener("share-link", (e) => {
            const { hash, title } = e.detail;
            shareLink({ url: linkTo(hash), title });
        });
    }
}
