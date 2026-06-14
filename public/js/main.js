import { CONFIG } from "./config.js";
import { CardRenderer } from "./modules/card-renderer.js";
import { DeckManager } from "./modules/deck-manager.js";
import { InteractionManager } from "./modules/interactions.js";
import "./components/tcg-card.js";

/**
 * Preload an image and resolve once it is loaded (or failed, to avoid
 * blocking the loader on a single broken asset).
 */
function preloadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = img.onerror = () => resolve();
        img.src = src;
    });
}

/**
 * Hide the loading overlay once the page is visually ready: fonts loaded,
 * card images decoded, plus a short minimum so the spinner doesn't flash.
 */
function hideLoaderWhenReady() {
    const loader = document.getElementById("app-loader");
    if (!loader) return;

    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const imagesReady = Promise.all(
        CONFIG.CARDS.map((card) => preloadImage(card.image))
    );
    const minDisplay = new Promise((resolve) => setTimeout(resolve, 400));

    Promise.all([fontsReady, imagesReady, minDisplay]).then(() => {
        loader.classList.add("is-hidden");
        loader.addEventListener(
            "transitionend",
            () => loader.remove(),
            { once: true }
        );
    });
}

document.addEventListener("DOMContentLoaded", () => {
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
