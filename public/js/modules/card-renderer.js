import { CONFIG } from "../config.js";

export class CardRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    render() {
        if (!this.container) return;

        this.container
            .querySelectorAll("tcg-card")
            .forEach((card) => card.remove());

        const fragment = document.createDocumentFragment();
        CONFIG.CARDS.forEach((cardData, index) => {
            const cardElement = document.createElement("tcg-card");
            // Position first: rendering reads it to decide the image loading priority.
            cardElement.dataset.pos = index;
            cardElement.data = cardData;
            fragment.appendChild(cardElement);
        });
        this.container.appendChild(fragment);
    }
}

