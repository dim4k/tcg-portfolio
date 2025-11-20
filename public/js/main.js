import { CardRenderer } from './modules/card-renderer.js';
import { DeckManager } from './modules/deck-manager.js';
import { InteractionManager } from './modules/interactions.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Render Cards
    const renderer = new CardRenderer('deck');
    renderer.render();

    // 2. Initialize Deck Manager
    const deckManager = new DeckManager();
    deckManager.init();

    // 3. Initialize Interactions
    new InteractionManager(deckManager);
});
