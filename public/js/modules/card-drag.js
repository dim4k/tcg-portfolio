import { CONFIG } from "../config.js";

// Only a pointer still moving within this window (ms) of the release counts as a flick.
const RELEASE_WINDOW = 80;

/**
 * A held card follows the pointer: updates the drag's offset and its speed over the last two
 * samples, and returns the card's transform. Shared with the card out of a binder pocket.
 */
export function followPointer(drag, e) {
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    const dt = Math.max(e.timeStamp - drag.t, 1);
    drag.vx = (dx - drag.dx) / dt;
    drag.vy = (dy - drag.dy) / dt;
    drag.t = e.timeStamp;
    drag.dx = dx;
    drag.dy = dy;
    return `translate3d(${dx}px, ${dy}px, 0) rotate(${dx * CONFIG.DRAG_ROTATION}deg)`;
}

/** Whether a press starts on a link or a button inside the card (through its shadow root). */
export function pressedControl(e) {
    return Boolean(e.composedPath()[0]?.closest?.("a, button"));
}

/**
 * A press on a link or a button grabs the card only once it moves: the pointer is captured
 * then, so that a plain click still reaches the control, and the click a drag would end
 * with is swallowed.
 */
export function grabFromControl(card, pointerId) {
    card.setPointerCapture(pointerId);
    const swallow = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    // No click follows when the pointer is let go away from the card.
    window.addEventListener(
        "pointerup",
        () => setTimeout(() => window.removeEventListener("click", swallow, true)),
        { once: true }
    );
}

/** Whether a drag released at `releasedAt` is a throw: carried far, or still moving fast. */
export function isThrow(drag, releasedAt) {
    const far = Math.hypot(drag.dx, drag.dy) > CONFIG.THROW_DISTANCE;
    // Holding still before letting go is a drop, whatever the speed before the pause.
    const fresh = releasedAt - drag.t < RELEASE_WINDOW;
    return far || (fresh && Math.hypot(drag.vx, drag.vy) > CONFIG.THROW_VELOCITY);
}

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
        // A press that never moved and was let go off the card leaves a stale drag behind.
        if (this.drag?.moving || deck.isAnimating || deck.isBinderOpen) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;

        const card = e.target.closest?.("tcg-card");
        if (!card || card !== deck.cards[0]) return;

        // Links and buttons inside the card keep their own click, unless the press moves.
        const control = pressedControl(e);

        this.drag = {
            card,
            control,
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
        if (!control) card.setPointerCapture(e.pointerId);
    }

    onMove(e) {
        const drag = this.drag;
        if (!drag || e.pointerId !== drag.pointerId) return;

        if (!drag.moving) {
            const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
            if (moved < CONFIG.DRAG_START_DISTANCE) return;
            drag.moving = true;
            if (drag.control) grabFromControl(drag.card, drag.pointerId);
            this.deckManager.isDragging = true;
            drag.card.classList.add("is-dragging");
            drag.card.style.setProperty("--glare-opacity", "0");
        }

        drag.card.style.transform = followPointer(drag, e);
    }

    onUp(e) {
        const drag = this.drag;
        if (!drag || e.pointerId !== drag.pointerId) return;
        this.drag = null;

        const { card } = drag;

        if (!drag.moving) {
            if (card.hasBack && !drag.control) card.toggleFlip();
            return;
        }

        this.deckManager.isDragging = false;

        if (isThrow(drag, e.timeStamp)) {
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
