import { CardRenderer } from "./modules/card-renderer.js";
import { DeckManager } from "./modules/deck-manager.js";
import { InteractionManager } from "./modules/interactions.js";
import { icon } from "./modules/icons.js";
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
        .querySelector("tcg-card")
        ?.shadowRoot?.querySelector(".card-image");

    if (!img || img.complete) return Promise.resolve();

    return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
    });
}

function hideLoaderWhenReady() {
    const loader = document.getElementById("app-loader");
    if (!loader) return;

    const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    Promise.all([
        timeout(LOADER_MIN_DISPLAY),
        Promise.race([heroImageReady(), timeout(LOADER_MAX_WAIT)]),
    ]).then(() => {
        loader.classList.add("is-hidden");
        loader.addEventListener("transitionend", () => loader.remove(), {
            once: true,
        });
        // transitionend never fires under reduced motion or in a background tab.
        setTimeout(() => loader.remove(), LOADER_FADE + 200);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // 0. Swap the static icon placeholders for their inline SVG
    document.querySelectorAll("[data-icon]").forEach((placeholder) => {
        placeholder.replaceWith(icon(placeholder.dataset.icon));
    });

    // 1. Render Cards
    const renderer = new CardRenderer("deck");
    renderer.render();

    // 2. Initialize Deck Manager
    const deckManager = new DeckManager();
    deckManager.init();

    // 3. Initialize Interactions
    new InteractionManager(deckManager);

    // 4. Hide the loading overlay once everything is ready
    hideLoaderWhenReady();
});
