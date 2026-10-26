import { findSlug } from "./card-renderer.js";
import { Collection } from "./collection.js";

/**
 * antoine.kim/#projects opens the deck on the Projects card, #kimpay on a card of After Hours
 * (adding that set to the collection if needed), and the hash follows the card in front so the
 * address bar is always a link to what is on screen. The hash is replaced, not pushed: cycling
 * five cards must not take five presses of Back to leave the site.
 */
export class DeepLink {
    /**
     * The set and card named by the current hash, or null. A secret card stays secret until
     * the visitor has unlocked it: a link to it opens nothing.
     */
    static fromHash() {
        const slug = decodeURIComponent(window.location.hash.slice(1));
        const target = slug ? findSlug(slug) : null;
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
            if (target) deckManager.showCard(target.set, target.index);
        });
    }
}
