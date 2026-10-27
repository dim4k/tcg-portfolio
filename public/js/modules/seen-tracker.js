import { CONFIG } from "../config.js";
import { Collection } from "./collection.js";
import { showToast } from "./toast.js";
import { t } from "../i18n.js";

/**
 * Counts the cards a visitor actually looks at: one that stays CONFIG.SEEN_DWELL in front of
 * the deck while the deck is on screen, or that the visitor flips (the binder takes its own
 * pockets into account). Until then the card wears a "new" badge, so the rule shows itself.
 * Seeing the last one unlocks the secret sets, announced by a toast.
 */
export class SeenTracker {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.timer = null;

        document.addEventListener("deck-change", (e) => this.watch(e.detail.index));
        // Turning the front card over is looking at it, however fast.
        document.addEventListener("card-flip", (e) => {
            if (e.target === deckManager.cards[0]) Collection.markSeen(e.target.data.slug);
        });
        document.addEventListener("collection-complete", () => showToast(t("collection.unlocked")));
        // The deck announced its first card before this listener existed.
        this.watch(deckManager.activeIndex);
    }

    // Covered by the loader or a booster, behind the binder, in a hidden tab: nobody sees it.
    get isHidden() {
        const deck = this.deckManager;
        return deck.isCovered || deck.isBinderOpen || deck.isAnimating || document.hidden;
    }

    watch(index) {
        clearTimeout(this.timer);
        const check = () => {
            const deck = this.deckManager;
            if (deck.activeIndex !== index || !deck.cardData[index]) return;
            if (this.isHidden) {
                this.timer = setTimeout(check, CONFIG.SEEN_DWELL);
                return;
            }
            Collection.markSeen(deck.cardData[index].slug);
        };
        this.timer = setTimeout(check, CONFIG.SEEN_DWELL);
    }
}
