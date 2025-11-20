import { CONFIG } from '../config.js';
import { clamp } from './utils.js';

export class InteractionManager {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.state = {
            isMobile: window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches,
            gyroBase: { beta: 0, gamma: 0 },
            gyroInitialized: false,
            swipeHintShown: false,
            touchStartY: 0
        };
        
        this.elements = {
            deckContainer: document.getElementById('deck'),
            swipeHint: document.querySelector('.swipe-hint-mobile')
        };

        this.bindEvents();
        if (this.state.isMobile) {
            this.initializeGyroscope();
            this.initializeSwipeHint();
        }
    }

    bindEvents() {
        // Mouse interactions
        this.elements.deckContainer.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.elements.deckContainer.addEventListener('mouseleave', () => this.handleMouseLeave());
        
        // Scroll
        window.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Touch
        window.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        window.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Theme switcher
        document.addEventListener('click', (e) => this.handleThemeClick(e));
    }

    getActiveCard() {
        return document.querySelector('.card[data-pos="0"]');
    }

    handleMouseMove(e) {
        const activeCard = this.getActiveCard();
        if (!activeCard || this.deckManager.isAnimating) return;

        const rect = activeCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * CONFIG.MOUSE_ROTATION_FACTOR;
        const rotateY = ((x - centerX) / centerX) * -CONFIG.MOUSE_ROTATION_FACTOR;

        activeCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;

        const glare = activeCard.querySelector('.glare');
        const holo = activeCard.querySelector('.holo-overlay');
        
        const pctX = (x / rect.width) * 100;
        const pctY = (y / rect.height) * 100;

        activeCard.style.setProperty('--mx', `${pctX}%`);
        activeCard.style.setProperty('--my', `${pctY}%`);
        
        if (glare) glare.style.opacity = '1';
        if (holo) holo.style.backgroundPosition = `${pctX}% ${pctY}%`;
    }

    handleMouseLeave() {
        const activeCard = this.getActiveCard();
        if (!activeCard) return;
        
        activeCard.style.transform = '';
        const glare = activeCard.querySelector('.glare');
        if (glare) glare.style.opacity = '0';
    }

    handleWheel(e) {
        if (e.deltaY > 0) {
            this.deckManager.rotateCards();
        }
    }

    handleTouchStart(e) {
        this.state.touchStartY = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        const touchEndY = e.changedTouches[0].clientY;
        const swipeDistance = touchEndY - this.state.touchStartY;
        
        if (swipeDistance > CONFIG.SWIPE_THRESHOLD) {
            if (!this.state.swipeHintShown) {
                this.hideSwipeHint();
            }
            this.deckManager.rotateCards();
        }
    }

    handleOrientation(event) {
        const activeCard = this.getActiveCard();
        if (!activeCard || this.deckManager.isAnimating) return;

        if (!this.state.gyroInitialized) {
            this.state.gyroBase.beta = event.beta || 0;
            this.state.gyroBase.gamma = event.gamma || 0;
            this.state.gyroInitialized = true;
            return;
        }

        const beta = event.beta || 0;
        const gamma = event.gamma || 0;

        const relativeBeta = beta - this.state.gyroBase.beta;
        const relativeGamma = gamma - this.state.gyroBase.gamma;

        const rotateX = clamp(
            relativeBeta * CONFIG.GYRO_SENSITIVITY,
            -CONFIG.GYRO_MAX_ROTATION,
            CONFIG.GYRO_MAX_ROTATION
        );
        const rotateY = clamp(
            relativeGamma * CONFIG.GYRO_SENSITIVITY,
            -CONFIG.GYRO_MAX_ROTATION,
            CONFIG.GYRO_MAX_ROTATION
        );

        activeCard.style.transform = `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;

        const glare = activeCard.querySelector('.glare');
        const holo = activeCard.querySelector('.holo-overlay');
        
        const pctX = 50 + (relativeGamma * 2);
        const pctY = 50 + (relativeBeta * 2);

        activeCard.style.setProperty('--mx', `${pctX}%`);
        activeCard.style.setProperty('--my', `${pctY}%`);
        
        if (glare) glare.style.opacity = '0.8';
        if (holo) holo.style.backgroundPosition = `${pctX}% ${pctY}%`;
    }

    initializeGyroscope() {
        if (!this.state.isMobile) return;

        const handleOrientation = (e) => this.handleOrientation(e);

        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            document.addEventListener('touchstart', () => {
                DeviceOrientationEvent.requestPermission()
                    .then(response => {
                        if (response === 'granted') {
                            window.addEventListener('deviceorientation', handleOrientation);
                        }
                    })
                    .catch(console.error);
            }, { once: true });
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
        }
    }

    showSwipeHint() {
        if (!this.elements.swipeHint || this.state.swipeHintShown) return;
        
        this.elements.swipeHint.classList.remove('show');
        void this.elements.swipeHint.offsetWidth;
        this.elements.swipeHint.classList.add('show');
    }

    hideSwipeHint() {
        this.state.swipeHintShown = true;
        if (this.elements.swipeHint) {
            this.elements.swipeHint.classList.remove('show');
            this.elements.swipeHint.style.display = 'none';
        }
    }

    initializeSwipeHint() {
        if (!this.state.isMobile || !this.elements.swipeHint) return;
        
        setTimeout(() => {
            this.showSwipeHint();
            const hintInterval = setInterval(() => {
                if (!this.state.swipeHintShown) {
                    this.showSwipeHint();
                } else {
                    clearInterval(hintInterval);
                }
            }, CONFIG.HINT_REPEAT_INTERVAL);
        }, CONFIG.HINT_INITIAL_DELAY);
    }

    handleThemeClick(e) {
        if (e.target.closest('.theme-btn')) {
            const btn = e.target.closest('.theme-btn');
            const theme = btn.dataset.theme;
            const card = btn.closest('.card');
            
            if (card) {
                const currentTransform = card.dataset.pos === '0' ? card.style.transform : '';
                
                card.classList.remove('theme-dark', 'theme-ice', 'theme-fire', 'theme-electric', 'theme-psychic', 'theme-grass');
                card.classList.add(`theme-${theme}`);
                
                if (card.dataset.pos === '0') {
                    this.deckManager.updateBackground(theme);
                    if (currentTransform) {
                        card.style.transform = currentTransform;
                    }
                }
            }
        }
    }
}
