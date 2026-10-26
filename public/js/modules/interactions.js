import { CONFIG } from "../config.js";
import { Utils } from "./utils.js";

function setCardVars(card, { mx, my, glare }) {
    card.style.setProperty("--mx", `${mx}%`);
    card.style.setProperty("--my", `${my}%`);
    card.style.setProperty("--glare-opacity", `${glare}`);
}

/**
 * Apply a 3D tilt transform and the holo/glare CSS variables to a card.
 * Shared by the mouse-move and gyroscope code paths.
 */
function applyTilt(card, { rotateX, rotateY, scale = 1, glare, mx, my }) {
    const scalePart = scale !== 1 ? ` scale(${scale})` : "";
    card.style.transform = `perspective(${CONFIG.TILT_PERSPECTIVE}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)${scalePart}`;
    setCardVars(card, { mx, my, glare });
}

/**
 * Tilt a card towards the pointer. `rect` is the card's untransformed box: reading it from
 * the tilted card itself would make the tilt chase its own projection.
 */
export function pointerTilt(card, rect, clientX, clientY) {
    if (Utils.prefersReducedMotion()) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    applyTilt(card, {
        rotateX: ((y - centerY) / centerY) * CONFIG.MOUSE_ROTATION_FACTOR,
        rotateY: ((x - centerX) / centerX) * -CONFIG.MOUSE_ROTATION_FACTOR,
        scale: CONFIG.TILT_SCALE,
        glare: CONFIG.GLARE_MOUSE,
        mx: (x / rect.width) * 100,
        my: (y / rect.height) * 100,
    });
}

/** Shortest signed difference between two angles, in degrees: never more than 180 either way. */
function angleDelta(a, b) {
    return ((((a - b + 180) % 360) + 360) % 360) - 180;
}

/** Eases towards ±max instead of stopping dead at it, so the tilt never sticks at an edge. */
function soft(value, max) {
    return max * Math.tanh(value / max);
}

/**
 * Front-to-back (x) and side-to-side (y) tilt of the phone as its screen is held: the
 * sensor's axes are the device's, so they swap in landscape. Null when the reading is no
 * good: held upright, side-to-side tilt flips around at random.
 */
function screenTilt({ beta, gamma }) {
    if (beta == null || gamma == null) return null;
    const angle = (((screen.orientation?.angle ?? window.orientation ?? 0) % 360) + 360) % 360;
    if (angle === 90) return { x: -gamma, y: beta };
    if (angle === 270) return { x: gamma, y: -beta };
    if (Math.abs(beta) > 85) return null;
    return angle === 180 ? { x: -beta, y: -gamma } : { x: beta, y: gamma };
}

export function resetTilt(card) {
    card.style.transform = "";
    setCardVars(card, { mx: 50, my: 50, glare: 0 });
}

export class InteractionManager {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.lastHoveredCard = null;
        this.rafId = null;
        this.hasPending = false;
        // Reused in place so pointer/gyro events allocate nothing.
        this.pending = { card: null, mode: "", a: 0, b: 0 };
        this.rectCache = { card: null, rect: null };
        this.boundFrame = () => this.runFrame();
        this.orientationHandler = null;
        this.wheelAccum = 0;
        this.wheelResetTimer = null;
        this.state = {
            isMobile: Utils.isMobile(),
            // The phone's rest position (null until its first reading), the time of the last
            // reading, and the smoothed tilt away from rest.
            gyro: { base: null, t: 0, x: 0, y: 0 },
        };

        this.elements = {
            deckContainer: document.getElementById("deck"),
        };

        this.bindEvents();
        this.syncMobileFeatures();
    }

    // Tilt must leave the card alone while it is held, thrown, or behind the binder; a card
    // taken out of a binder pocket gets it instead.
    get isBusy() {
        const deck = this.deckManager;
        return deck.isAnimating || deck.isDragging || (deck.isBinderOpen && !deck.peekCard);
    }

    bindEvents() {
        // Mouse interactions
        this.elements.deckContainer.addEventListener("mousemove", (e) =>
            this.handleMouseMove(e)
        );
        this.elements.deckContainer.addEventListener("mouseleave", () =>
            this.handleMouseLeave()
        );
        // The card taken out of a binder pocket follows the pointer the same way.
        const peekSlot = document.getElementById("binder-peek-card");
        peekSlot?.addEventListener("mousemove", (e) => this.handleMouseMove(e));
        peekSlot?.addEventListener("mouseleave", () => this.handleMouseLeave());

        // Scroll (passive: we never call preventDefault here)
        window.addEventListener("wheel", (e) => this.handleWheel(e), {
            passive: true,
        });

        // Keyboard navigation: cycle the deck with the arrow keys.
        window.addEventListener("keydown", (e) => this.handleKeydown(e));

        // Anything that can move a card's box invalidates the cached rect.
        window.addEventListener("resize", () => this.invalidateRect(), {
            passive: true,
        });

        // Rotating a phone or resizing across the breakpoint must (de)activate the mobile bits.
        Utils.mobileMql.addEventListener("change", () =>
            this.syncMobileFeatures()
        );
    }

    syncMobileFeatures() {
        this.state.isMobile = Utils.isMobile();
        this.invalidateRect();

        if (this.state.isMobile) {
            this.initializeGyroscope();
        } else {
            this.teardownGyroscope();
        }
    }

    getActiveCard() {
        return this.deckManager.peekCard || this.deckManager.cards[0] || null;
    }

    invalidateRect() {
        this.rectCache.card = null;
    }

    /**
     * Measuring inside the frame callback would force a synchronous layout, because the previous
     * frame just wrote a transform on this very element. The active card is inset into its
     * container (the deck, or the binder's peek slot), so the container's box is the card's
     * untransformed box.
     */
    getCardRect(card) {
        const cache = this.rectCache;

        if (cache.card !== card) {
            cache.card = card;
            cache.rect = card.parentElement.getBoundingClientRect();
        }
        return cache.rect;
    }

    scheduleFrame(card, mode, a, b) {
        const pending = this.pending;
        pending.card = card;
        pending.mode = mode;
        pending.a = a;
        pending.b = b;
        this.hasPending = true;

        if (this.rafId === null) {
            this.rafId = requestAnimationFrame(this.boundFrame);
        }
    }

    runFrame() {
        this.rafId = null;
        if (!this.hasPending) return;
        this.hasPending = false;

        const { card, mode, a, b } = this.pending;
        // A drag may have started between the event and this frame.
        if (!card || this.isBusy) return;

        if (mode === "pointer") this.applyCardEffect(card, a, b);
        else this.applyOrientation(card, a, b);
    }

    handleKeydown(e) {
        if (this.deckManager.isBinderOpen) return;
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;

        const navKeys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
        if (!navKeys.includes(e.key)) return;

        // Never swallow arrows aimed at a focused control inside a card.
        const target = e.composedPath ? e.composedPath()[0] : e.target;
        if (
            target?.closest?.("a, button, input, textarea, select, [contenteditable]")
        ) {
            return;
        }

        e.preventDefault();
        this.deckManager.rotateCards(
            e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1
        );
    }

    handleMouseMove(e) {
        if (this.isBusy) return;

        const targetCard = this.getActiveCard();

        if (this.lastHoveredCard && this.lastHoveredCard !== targetCard) {
            resetTilt(this.lastHoveredCard);
        }
        this.lastHoveredCard = targetCard;

        if (!targetCard) return;

        // Throttle DOM writes to one per animation frame.
        this.scheduleFrame(targetCard, "pointer", e.clientX, e.clientY);
    }

    handleMouseLeave() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.hasPending = false;
        this.pending.card = null;
        this.invalidateRect();
        // A card that is held or flying owns its transform. A flicked card leaves the pointer
        // behind mid-flight, and clearing its transform then would pull it back to the deck.
        const deck = this.deckManager;
        if (this.lastHoveredCard && !deck.isDragging && !deck.isAnimating) {
            resetTilt(this.lastHoveredCard);
        }
        this.lastHoveredCard = null;
    }

    applyCardEffect(card, clientX, clientY) {
        pointerTilt(card, this.getCardRect(card), clientX, clientY);
    }

    handleWheel(e) {
        if (this.isBusy) {
            this.wheelAccum = 0;
            return;
        }

        // A single trackpad flick emits dozens of events over ~500ms; require a whole
        // gesture per rotation instead of cycling several cards at once.
        this.wheelAccum += e.deltaY;

        clearTimeout(this.wheelResetTimer);
        this.wheelResetTimer = setTimeout(() => {
            this.wheelAccum = 0;
        }, 200);

        if (Math.abs(this.wheelAccum) < CONFIG.WHEEL_THRESHOLD) return;

        const direction = this.wheelAccum > 0 ? 1 : -1;
        this.wheelAccum = 0;
        this.deckManager.rotateCards(direction);
    }

    handleOrientation(event) {
        const activeCard = this.getActiveCard();
        if (!activeCard || this.isBusy) return;

        const tilt = screenTilt(event);
        if (!tilt) return;

        const gyro = this.state.gyro;
        if (!gyro.base) {
            gyro.base = tilt;
            gyro.t = event.timeStamp;
            return;
        }

        // The rest position drifts towards the way the phone is held now: a tilt moves the
        // card, a new grip slowly becomes the new rest. After a pause (a drag, the binder),
        // the drift has had time to catch up, and the card starts again from the middle.
        const dt = Math.max(0, event.timeStamp - gyro.t);
        gyro.t = event.timeStamp;
        const dx = angleDelta(tilt.x, gyro.base.x);
        const dy = angleDelta(tilt.y, gyro.base.y);
        const follow = 1 - Math.exp(-dt / CONFIG.GYRO_RECENTER);
        gyro.base.x += dx * follow;
        gyro.base.y += dy * follow;

        // iOS fires this at up to 60Hz; batch the DOM writes like the pointer path.
        this.scheduleFrame(activeCard, "tilt", dx, dy);
    }

    /** @param {number} dx @param {number} dy Tilt (deg) away from the rest position. */
    applyOrientation(card, dx, dy) {
        if (Utils.prefersReducedMotion()) return;

        const gyro = this.state.gyro;
        gyro.x += (dx - gyro.x) * CONFIG.GYRO_SMOOTHING;
        gyro.y += (dy - gyro.y) * CONFIG.GYRO_SMOOTHING;

        applyTilt(card, {
            rotateX: -soft(gyro.x * CONFIG.GYRO_SENSITIVITY, CONFIG.GYRO_MAX_ROTATION),
            rotateY: soft(gyro.y * CONFIG.GYRO_SENSITIVITY, CONFIG.GYRO_MAX_ROTATION),
            glare: CONFIG.GLARE_GYRO,
            mx: 50 + 50 * Math.tanh(gyro.y / CONFIG.GYRO_LIGHT_RANGE),
            my: 50 + 50 * Math.tanh(gyro.x / CONFIG.GYRO_LIGHT_RANGE),
        });
    }

    initializeGyroscope() {
        if (!this.state.isMobile || this.orientationHandler) return;

        this.orientationHandler = (e) => this.handleOrientation(e);

        if (
            typeof DeviceOrientationEvent !== "undefined" &&
            typeof DeviceOrientationEvent.requestPermission === "function"
        ) {
            document.addEventListener(
                "touchstart",
                () => {
                    DeviceOrientationEvent.requestPermission()
                        .then((response) => {
                            if (response === "granted" && this.orientationHandler) {
                                window.addEventListener(
                                    "deviceorientation",
                                    this.orientationHandler
                                );
                            }
                        })
                        .catch(console.error);
                },
                { once: true }
            );
        } else {
            window.addEventListener(
                "deviceorientation",
                this.orientationHandler
            );
        }
    }

    teardownGyroscope() {
        if (!this.orientationHandler) return;

        window.removeEventListener(
            "deviceorientation",
            this.orientationHandler
        );
        this.orientationHandler = null;
        this.state.gyro.base = null;
    }
}
