window.TCG = window.TCG || {};

window.TCG.CardRenderer = class CardRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    render() {
        if (!this.container) return;
        const CONFIG = window.CONFIG;

        const swipeHint = this.container.querySelector(".swipe-hint-mobile");
        this.container.innerHTML = "";
        if (swipeHint) this.container.appendChild(swipeHint);

        CONFIG.CARDS.forEach((cardData, index) => {
            const cardElement = document.createElement("tcg-card");
            cardElement.data = cardData;
            cardElement.dataset.pos = index;
            this.container.appendChild(cardElement);
        });
    }
};
