import { CONFIG } from '../config.js';
import { SwirlBackground } from './swirl-background.js';

export class DeckManager {
    constructor() {
        this.isAnimating = false;
        this.swirlBackground = null;
        this.body = document.body;
        this.cards = [];
    }

    init() {
        this.cards = Array.from(document.querySelectorAll('.card'));
        this.updatePositions();
        this.initSwirlBackground();
    }

    getCards() {
        return this.cards;
    }

    updatePositions() {
        this.cards.forEach((card, index) => {
            card.dataset.pos = index;
            card.classList.remove('slide-out', 're-enter');
            card.style.transform = ''; 
        });

        const activeCard = this.cards[0];
        if (activeCard) {
            let themeName = 'default';
            if (activeCard.classList.contains('theme-dark')) themeName = 'dark';
            else if (activeCard.classList.contains('theme-fire')) themeName = 'fire';
            else if (activeCard.classList.contains('theme-electric')) themeName = 'electric';
            else if (activeCard.classList.contains('theme-psychic')) themeName = 'psychic';
            else if (activeCard.classList.contains('theme-grass')) themeName = 'grass';
            else if (activeCard.classList.contains('theme-ice')) themeName = 'ice';
            
            this.updateBackground(themeName);
        }
    }

    updateBackground(themeName) {
        const themeColor = CONFIG.THEME_COLORS[themeName] || CONFIG.THEME_COLORS.default;
        this.body.style.backgroundColor = themeColor;
        
        if (this.swirlBackground && !window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches) {
            this.swirlBackground.setTheme(themeName);
        }
    }

    rotateCards() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const topCard = this.cards[0];

        if (!topCard) return;

        topCard.classList.add('slide-out');

        setTimeout(() => {
            // Rotate the array instead of moving DOM elements
            this.cards.push(this.cards.shift());
            
            topCard.classList.remove('slide-out');
            
            this.updatePositions();
            
            setTimeout(() => {
                this.isAnimating = false;
            }, CONFIG.ANIMATION_BUFFER);
        }, CONFIG.ANIMATION_DELAY);
    }

    initSwirlBackground() {
        if (!window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches) {
            this.swirlBackground = new SwirlBackground('canvas-background');
            
            const cards = this.getCards();
            const activeCard = cards[0];
            let initialTheme = 'default';
            
            if (activeCard) {
                if (activeCard.classList.contains('theme-dark')) initialTheme = 'dark';
                else if (activeCard.classList.contains('theme-fire')) initialTheme = 'fire';
                else if (activeCard.classList.contains('theme-electric')) initialTheme = 'electric';
                else if (activeCard.classList.contains('theme-psychic')) initialTheme = 'psychic';
                else if (activeCard.classList.contains('theme-grass')) initialTheme = 'grass';
                else if (activeCard.classList.contains('theme-ice')) initialTheme = 'ice';
            }
            
            this.swirlBackground.setTheme(initialTheme);
        }
    }
}
