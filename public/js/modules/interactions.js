window.TCG = window.TCG || {};

window.TCG.InteractionManager = class InteractionManager {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.lastHoveredCard = null;
        const CONFIG = window.CONFIG;
        this.state = {
            isMobile: window.matchMedia(
                `(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`
            ).matches,
            gyroBase: { beta: 0, gamma: 0 },
            gyroInitialized: false,
            swipeHintShown: false,
            touchStartY: 0,
        };

        this.elements = {
            deckContainer: document.getElementById("deck"),
            swipeHint: document.querySelector(".swipe-hint-mobile"),
        };

        this.bindEvents();
        if (this.state.isMobile) {
            this.initializeGyroscope();
            this.initializeSwipeHint();
        }
    }

    bindEvents() {
        // Mouse interactions
        this.elements.deckContainer.addEventListener("mousemove", (e) =>
            this.handleMouseMove(e)
        );
        this.elements.deckContainer.addEventListener("mouseleave", () =>
            this.handleMouseLeave()
        );

        // Scroll
        window.addEventListener("wheel", (e) => this.handleWheel(e));

        // Touch
        window.addEventListener("touchstart", (e) => this.handleTouchStart(e));
        window.addEventListener("touchend", (e) => this.handleTouchEnd(e));

        // Theme switcher handled by component
    }

    getActiveCard() {
        return document.querySelector('tcg-card[data-pos="0"]');
    }

    handleMouseMove(e) {
        if (this.deckManager.isAnimating) return;

        let targetCard;
        if (this.deckManager.isGridView) {
            targetCard = e.target.closest("tcg-card");
        } else {
            targetCard = this.getActiveCard();
        }

        // If we switched cards (or moved off a card in grid view), reset the old one
        if (this.lastHoveredCard && this.lastHoveredCard !== targetCard) {
            this.resetCardEffect(this.lastHoveredCard);
        }
        this.lastHoveredCard = targetCard;

        if (!targetCard) return;

        this.applyCardEffect(targetCard, e.clientX, e.clientY);
    }

    handleMouseLeave() {
        if (this.lastHoveredCard) {
            this.resetCardEffect(this.lastHoveredCard);
            this.lastHoveredCard = null;
        }
    }

    applyCardEffect(card, clientX, clientY) {
        const CONFIG = window.CONFIG;
        const rect = card.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX =
            ((y - centerY) / centerY) * CONFIG.MOUSE_ROTATION_FACTOR;
        const rotateY =
            ((x - centerX) / centerX) * -CONFIG.MOUSE_ROTATION_FACTOR;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;

        const pctX = (x / rect.width) * 100;
        const pctY = (y / rect.height) * 100;

        card.style.setProperty("--mx", `${pctX}%`);
        card.style.setProperty("--my", `${pctY}%`);
        card.style.setProperty("--holo-x", `${pctX}%`);
        card.style.setProperty("--holo-y", `${pctY}%`);
        card.style.setProperty("--glare-opacity", "1");
    }

    resetCardEffect(card) {
        card.style.transform = "";
        card.style.setProperty("--mx", "50%");
        card.style.setProperty("--my", "50%");
        card.style.setProperty("--holo-x", "50%");
        card.style.setProperty("--holo-y", "50%");
        card.style.setProperty("--glare-opacity", "0");
    }

    handleWheel(e) {
        if (this.deckManager.isGridView) return;
        if (e.deltaY > 0) {
            this.deckManager.rotateCards();
        }
    }

    handleTouchStart(e) {
        this.state.touchStartY = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        if (this.deckManager.isGridView) return;
        const touchEndY = e.changedTouches[0].clientY;
        const swipeDistance = touchEndY - this.state.touchStartY;
        const CONFIG = window.CONFIG;

        if (swipeDistance > CONFIG.SWIPE_THRESHOLD) {
            if (!this.state.swipeHintShown) {
                this.hideSwipeHint();
            }
            this.deckManager.rotateCards();
        }
    }

    handleOrientation(event) {
        const activeCard = this.getActiveCard();
        if (
            !activeCard ||
            this.deckManager.isAnimating ||
            this.deckManager.isGridView
        )
            return;
        const CONFIG = window.CONFIG;

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

        const rotateX = window.TCG.Utils.clamp(
            relativeBeta * CONFIG.GYRO_SENSITIVITY,
            -CONFIG.GYRO_MAX_ROTATION,
            CONFIG.GYRO_MAX_ROTATION
        );
        const rotateY = window.TCG.Utils.clamp(
            relativeGamma * CONFIG.GYRO_SENSITIVITY,
            -CONFIG.GYRO_MAX_ROTATION,
            CONFIG.GYRO_MAX_ROTATION
        );

        activeCard.style.transform = `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;

        const pctX = 50 + relativeGamma * 2;
        const pctY = 50 + relativeBeta * 2;

        activeCard.style.setProperty("--mx", `${pctX}%`);
        activeCard.style.setProperty("--my", `${pctY}%`);
        activeCard.style.setProperty("--holo-x", `${pctX}%`);
        activeCard.style.setProperty("--holo-y", `${pctY}%`);
        activeCard.style.setProperty("--glare-opacity", "0.8");
    }

    initializeGyroscope() {
        if (!this.state.isMobile) return;

        const handleOrientation = (e) => this.handleOrientation(e);

        if (
            typeof DeviceOrientationEvent !== "undefined" &&
            typeof DeviceOrientationEvent.requestPermission === "function"
        ) {
            document.addEventListener(
                "touchstart",
                () => {
                    DeviceOrientationEvent.requestPermission()
                        .then((response) => {
                            if (response === "granted") {
                                window.addEventListener(
                                    "deviceorientation",
                                    handleOrientation
                                );
                            }
                        })
                        .catch(console.error);
                },
                { once: true }
            );
        } else {
            window.addEventListener("deviceorientation", handleOrientation);
        }
    }

    showSwipeHint() {
        if (!this.elements.swipeHint || this.state.swipeHintShown) return;

        this.elements.swipeHint.classList.remove("show");
        void this.elements.swipeHint.offsetWidth;
        this.elements.swipeHint.classList.add("show");
    }

    hideSwipeHint() {
        this.state.swipeHintShown = true;
        if (this.elements.swipeHint) {
            this.elements.swipeHint.classList.remove("show");
            this.elements.swipeHint.style.display = "none";
        }
    }

    initializeSwipeHint() {
        if (!this.state.isMobile || !this.elements.swipeHint) return;
        const CONFIG = window.CONFIG;

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
};
