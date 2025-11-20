document.addEventListener("DOMContentLoaded", () => {
    // 1. Render Cards
    const renderer = new window.TCG.CardRenderer("deck");
    renderer.render();

    // 2. Initialize Deck Manager
    const deckManager = new window.TCG.DeckManager();
    deckManager.init();

    // 3. Initialize Interactions
    new window.TCG.InteractionManager(deckManager);
});
