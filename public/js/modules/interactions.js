import { CONFIG } from "../config.js";
import { Utils } from "./utils.js";

export class InteractionManager {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.lastHoveredCard = null;
        this.rafId = null;
        this.pendingPointer = null;
        this.state = {
            isMobile: Utils.isMobile(),
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

        // Scroll (passive: we never call preventDefault here)
        window.addEventListener("wheel", (e) => this.handleWheel(e), {
            passive: true,
        });

        // Touch (passive)
        window.addEventListener(
            "touchstart",
            (e) => this.handleTouchStart(e),
            { passive: true }
        );
        window.addEventListener("touchend", (e) => this.handleTouchEnd(e), {
            passive: true,
        });

        // Keyboard navigation: cycle the deck with the arrow keys.
        window.addEventListener("keydown", (e) => this.handleKeydown(e));

        // Theme switcher handled by component
    }

    getActiveCard() {
        return document.querySelector('tcg-card[data-pos="0"]');
    }

    handleKeydown(e) {
        if (this.deckManager.isGridView) return;
        const navKeys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
        if (navKeys.includes(e.key)) {
            e.preventDefault();
            this.deckManager.rotateCards();
        }
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

        // Throttle DOM writes to one per animation frame.
        this.pendingPointer = { card: targetCard, x: e.clientX, y: e.clientY };
        if (this.rafId === null) {
            this.rafId = requestAnimationFrame(() => {
                this.rafId = null;
                const p = this.pendingPointer;
                if (p) this.applyCardEffect(p.card, p.x, p.y);
            });
        }
    }

    handleMouseLeave() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.pendingPointer = null;
        if (this.lastHoveredCard) {
            this.resetCardEffect(this.lastHoveredCard);
            this.lastHoveredCard = null;
        }
    }

    setCardVars(card, { mx, my, glare }) {
        card.style.setProperty("--mx", `${mx}%`);
        card.style.setProperty("--my", `${my}%`);
        card.style.setProperty("--holo-x", `${mx}%`);
        card.style.setProperty("--holo-y", `${my}%`);
        card.style.setProperty("--glare-opacity", `${glare}`);
    }

    /**
     * Apply a 3D tilt transform and the holo/glare CSS variables to a card.
     * Shared by the mouse-move and gyroscope code paths.
     */
    applyTilt(card, { rotateX, rotateY, scale = 1, glare, mx, my }) {
        const scalePart = scale !== 1 ? ` scale(${scale})` : "";
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)${scalePart}`;
        this.setCardVars(card, { mx, my, glare });
    }

    applyCardEffect(card, clientX, clientY) {
        const rect = card.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX =
            ((y - centerY) / centerY) * CONFIG.MOUSE_ROTATION_FACTOR;
        const rotateY =
            ((x - centerX) / centerX) * -CONFIG.MOUSE_ROTATION_FACTOR;

        const pctX = (x / rect.width) * 100;
        const pctY = (y / rect.height) * 100;

        this.applyTilt(card, {
            rotateX,
            rotateY,
            scale: 1.02,
            glare: 1,
            mx: pctX,
            my: pctY,
        });
    }

    resetCardEffect(card) {
        card.style.transform = "";
        this.setCardVars(card, { mx: 50, my: 50, glare: 0 });
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

        const rotateX = Utils.clamp(
            relativeBeta * CONFIG.GYRO_SENSITIVITY,
            -CONFIG.GYRO_MAX_ROTATION,
            CONFIG.GYRO_MAX_ROTATION
        );
        const rotateY = Utils.clamp(
            relativeGamma * CONFIG.GYRO_SENSITIVITY,
            -CONFIG.GYRO_MAX_ROTATION,
            CONFIG.GYRO_MAX_ROTATION
        );

        const pctX = Utils.clamp(50 + relativeGamma * 2, 0, 100);
        const pctY = Utils.clamp(50 + relativeBeta * 2, 0, 100);

        this.applyTilt(activeCard, {
            rotateX: -rotateX,
            rotateY,
            glare: 0.8,
            mx: pctX,
            my: pctY,
        });
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
}
