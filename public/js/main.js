import { CONFIG } from "./config.js";
import { DeckManager } from "./modules/deck-manager.js";
import { InteractionManager } from "./modules/interactions.js";
import { CardDrag } from "./modules/card-drag.js";
import { DeckNav } from "./modules/deck-nav.js";
import { DeepLink } from "./modules/deep-link.js";
import { BinderView } from "./modules/binder-view.js";
import { BoosterIntro } from "./modules/booster-intro.js";
import { CollectionDrawer } from "./modules/collection-drawer.js";
import { Collection } from "./modules/collection.js";
import { SeenTracker } from "./modules/seen-tracker.js";
import { GestureHint } from "./modules/gesture-hint.js";
import { icon } from "./modules/icons.js";
import { lang, setLang, translatePage } from "./i18n.js";
import "./components/tcg-card.js";

const LOADER_MIN_DISPLAY = 400;
const LOADER_MAX_WAIT = 3000;
const LOADER_FADE = 500;

/**
 * Resolve once the front card's image is on screen. Deliberately does not wait on
 * `document.fonts.ready`: that resolves only after third-party font CDNs answer.
 */
function heroImageReady() {
    const img = document
        .querySelector('tcg-card[data-pos="0"]')
        ?.shadowRoot?.querySelector(".card-image");

    if (!img || !img.getAttribute("src") || img.complete) return Promise.resolve();

    return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
    });
}

// The loader stays in the page, hidden: a booster left sealed opens in it later.
function hideLoader(loader, deckManager) {
    loader.classList.add("is-hidden");
    deckManager.setCovered(false);
    setTimeout(
        () => loader.querySelector(".skeleton-card")?.remove(),
        LOADER_FADE + 200
    );
}

/** Skeleton loader (return visits, reduced motion, deep links): gone once the hero is ready. */
function hideSkeletonWhenReady(loader, deckManager) {
    const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    return Promise.all([
        timeout(LOADER_MIN_DISPLAY),
        Promise.race([heroImageReady(), timeout(LOADER_MAX_WAIT)]),
    ]).then(() => hideLoader(loader, deckManager));
}

document.addEventListener("DOMContentLoaded", () => {
    // Tells the inline safety net in index.html that the app took over the loader.
    document.documentElement.dataset.app = "ready";

    // 0. Swap the static icon placeholders for their inline SVG, put the markup in the
    // visitor's language, and offer the other one.
    document.querySelectorAll("[data-icon]").forEach((placeholder) => {
        placeholder.replaceWith(icon(placeholder.dataset.icon));
    });
    translatePage();
    // The toolbar's, and the lobby's on a first visit.
    document.querySelectorAll("#lang-btn, #booster-lang").forEach((btn) =>
        btn.addEventListener("click", () => setLang(lang === "fr" ? "en" : "fr"))
    );
    // Before anything reads it: on a first visit, every set is known already.
    Collection.initKnown();

    // 1-2. Deal the collection: the sets opened this session, plus the set of a card a deep
    // link points at. Without either (reduced motion), the first set; while the booster intro
    // is pending, nothing yet.
    const link = DeepLink.fromHash();
    const opened = Collection.read();
    if (link && !opened.includes(link.set)) opened.push(link.set);
    if (!opened.length && !BoosterIntro.isPending()) opened.push(CONFIG.SETS[0]);
    const deckManager = new DeckManager();
    deckManager.init(opened, link);

    // 3. Initialize Interactions and the controls around the deck
    new InteractionManager(deckManager);
    new CardDrag(deckManager);
    new DeckNav(deckManager);
    new CollectionDrawer(deckManager);
    new DeepLink(deckManager);
    new BinderView(deckManager);
    new SeenTracker(deckManager);
    const gestureHint = new GestureHint(deckManager);

    // The holo foil only shows under a moving light, so each new front card gets one sweep.
    const shine = (card) => setTimeout(() => card.playShine(), CONFIG.SHINE_DELAY);
    document.addEventListener("deck-change", (e) => shine(e.detail.card));

    // 4. Hide the loading overlay: once a booster is opened, or once ready for the skeleton
    const loader = document.getElementById("app-loader");
    if (!loader) return;

    // The swirl waits under the opaque loader: drawn there, nobody would see it.
    deckManager.setCovered(true);

    const booster = new BoosterIntro(deckManager, loader);
    const ready = BoosterIntro.isPending()
        ? booster.run()
        : hideSkeletonWhenReady(loader, deckManager);
    ready.then(() => {
        shine(deckManager.cards[0]);
        // Once the light has swept the card, a word on how to handle it (first visit only).
        setTimeout(() => gestureHint.show(), CONFIG.SHINE_DELAY + 900);
    });
});
