import { CONFIG } from "../config.js";

// Only a pointer still moving within this window (ms) of the release counts as a flick.
const RELEASE_WINDOW = 80;

/**
 * Grab the front card with a mouse or a finger and throw it to cycle the deck. A press that
 * barely moves is a click instead, and flips the card when it has a back.
 */
export class CardDrag {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.deck = document.getElementById("deck");
        this.drag = null;

        this.deck.addEventListener("pointerdown", (e) => this.onDown(e));
        this.deck.addEventListener("pointermove", (e) => this.onMove(e));
        this.deck.addEventListener("pointerup", (e) => this.onUp(e));
        this.deck.addEventListener("pointercancel", () => this.cancel());
    }

    onDown(e) {
        const deck = this.deckManager;
        if (this.drag || deck.isAnimating || deck.isBinderOpen) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;

        const card = e.target.closest?.("tcg-card");
        if (!card || card !== deck.cards[0]) return;

        // Links and buttons inside the card keep their own click.
        const origin = e.composedPath()[0];
        if (origin?.closest?.("a, button")) return;

        this.drag = {
            card,
            pointerId: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            dx: 0,
            dy: 0,
            moving: false,
            // Last two samples, for the release speed.
            t: e.timeStamp,
            vx: 0,
            vy: 0,
        };
        card.setPointerCapture(e.pointerId);
    }

    onMove(e) {
        const drag = this.drag;
        if (!drag || e.pointerId !== drag.pointerId) return;

        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;

        if (!drag.moving) {
            if (Math.hypot(dx, dy) < CONFIG.DRAG_START_DISTANCE) return;
            drag.moving = true;
            this.deckManager.isDragging = true;
            drag.card.classList.add("is-dragging");
            drag.card.style.setProperty("--glare-opacity", "0");
        }

        const dt = Math.max(e.timeStamp - drag.t, 1);
        drag.vx = (dx - drag.dx) / dt;
        drag.vy = (dy - drag.dy) / dt;
        drag.t = e.timeStamp;
        drag.dx = dx;
        drag.dy = dy;

        drag.card.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${dx * CONFIG.DRAG_ROTATION}deg)`;
    }

    onUp(e) {
        const drag = this.drag;
        if (!drag || e.pointerId !== drag.pointerId) return;
        this.drag = null;

        const { card } = drag;

        if (!drag.moving) {
            if (card.hasBack) card.toggleFlip();
            return;
        }

        this.deckManager.isDragging = false;

        const far = Math.hypot(drag.dx, drag.dy) > CONFIG.THROW_DISTANCE;
        // Holding still before letting go is a drop, whatever the speed before the pause.
        const fresh = e.timeStamp - drag.t < RELEASE_WINDOW;
        const fast =
            fresh && Math.hypot(drag.vx, drag.vy) > CONFIG.THROW_VELOCITY;

        if (far || fast) {
            this.deckManager.throwCard(card, drag.dx, drag.dy);
        } else {
            this.snapBack(card);
        }
    }

    cancel() {
        const drag = this.drag;
        if (!drag) return;
        this.drag = null;
        if (drag.moving) {
            this.deckManager.isDragging = false;
            this.snapBack(drag.card);
        }
    }

    snapBack(card) {
        card.classList.remove("is-dragging");
        card.style.transform = "";
    }
}
