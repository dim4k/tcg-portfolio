import { Utils } from "./utils.js";

// How long (ms) a point of the cut trail and the slash of a finished cut stay on screen.
const TRAIL_LIFE = 220;
const SLASH_LIFE = 380;
// Steps of the trail's glow, from its fresh head to its fading tail.
const TRAIL_SLICES = 4;
const GRAVITY = 0.22;
const DRAG = 0.985;

/**
 * Short-lived effects of the booster intro, drawn over everything in viewport coordinates:
 * sparks and confetti, the light trail of the cut, a white flash and a shockwave. The canvas
 * only runs a frame loop while something is on it, and everything is skipped under reduced
 * motion.
 */
export class BoosterFx {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.canvas.className = "booster-fx";
        this.canvas.setAttribute("aria-hidden", "true");
        this.ctx = this.canvas.getContext("2d");
        this.flashEl = document.createElement("div");
        this.flashEl.className = "booster-flash";
        document.body.append(this.canvas, this.flashEl);

        this.sparks = [];
        this.trail = [];
        this.slashes = [];
        this.raf = 0;
        this.boundFrame = () => this.frame();

        this.resize();
        window.addEventListener("resize", () => this.resize(), { passive: true });
    }

    get calm() {
        return Utils.prefersReducedMotion();
    }

    resize() {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    kick() {
        if (!this.raf) this.raf = requestAnimationFrame(this.boundFrame);
    }

    /** Sparks (streaks) and confetti (spinning chips) thrown out from x, y. */
    burst(x, y, colors, count = 60, power = 9) {
        if (this.calm) return;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = power * (0.3 + Math.random() * 0.9);
            this.sparks.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - power * 0.35,
                life: 1,
                decay: 0.012 + Math.random() * 0.02,
                size: 1.2 + Math.random() * 2.4,
                color: colors[i % colors.length],
                chip: Math.random() < 0.35,
                rot: Math.random() * 6,
                spin: (Math.random() - 0.5) * 0.4,
            });
        }
        this.kick();
    }

    /** One more point of the light that follows the pointer while it cuts. */
    trace(x, y) {
        this.trail.push({ x, y, t: performance.now() });
        this.kick();
    }

    /** The bright line left by a finished cut, from a to b. */
    slash(a, b) {
        this.slashes.push({ a, b, t: performance.now() });
        this.kick();
    }

    flash(strength = 0.85) {
        if (this.calm) return;
        this.flashEl.animate(
            [{ opacity: 0 }, { opacity: strength, offset: 0.15 }, { opacity: 0 }],
            { duration: 420, easing: "ease-out" }
        );
    }

    shock(x, y) {
        if (this.calm) return;
        const ring = document.createElement("div");
        ring.className = "booster-shock";
        ring.style.left = `${x}px`;
        ring.style.top = `${y}px`;
        document.body.append(ring);
        ring.animate(
            [
                { transform: "translate(-50%, -50%) scale(0.2)", opacity: 1 },
                { transform: "translate(-50%, -50%) scale(3.4)", opacity: 0 },
            ],
            { duration: 650, easing: "cubic-bezier(.2,.7,.3,1)" }
        ).finished.then(() => ring.remove());
    }

    shake(el, power = 1) {
        if (this.calm) return;
        const k = 7 * power;
        el.animate(
            [
                { transform: "translate(0, 0)" },
                { transform: `translate(${-k}px, ${k * 0.6}px)` },
                { transform: `translate(${k * 0.8}px, ${-k * 0.7}px)` },
                { transform: `translate(${-k * 0.5}px, ${k * 0.4}px)` },
                { transform: `translate(${k * 0.3}px, ${-k * 0.2}px)` },
                { transform: "translate(0, 0)" },
            ],
            { duration: 380, easing: "ease-out" }
        );
    }

    frame() {
        this.raf = 0;
        const ctx = this.ctx;
        const now = performance.now();
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const p = this.sparks[i];
            p.vx *= DRAG;
            p.vy = p.vy * DRAG + GRAVITY;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.spin;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.sparks.splice(i, 1);
                continue;
            }
            ctx.globalAlpha = Math.min(1, p.life * 1.4);
            if (p.chip) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size * 1.2, -p.size * 0.5, p.size * 2.4, p.size);
                ctx.restore();
            } else {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.size;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
                ctx.stroke();
            }
        }

        while (this.trail.length && now - this.trail[0].t > TRAIL_LIFE) this.trail.shift();
        const trail = this.trail;
        ctx.strokeStyle = "#fff";
        ctx.shadowColor = "#8fe3ff";
        // The glow blurs once per stroke: it is drawn a slice of the trail's age at a time,
        // then the core over it, thinning and fading segment by segment, without a blur.
        ctx.shadowBlur = 14;
        let slice = -1;
        for (let i = 1; i < trail.length; i++) {
            const k = 1 - (now - trail[i].t) / TRAIL_LIFE;
            const s = Math.min(TRAIL_SLICES - 1, Math.max(0, Math.floor(k * TRAIL_SLICES)));
            if (s !== slice) {
                if (slice >= 0) ctx.stroke();
                slice = s;
                ctx.globalAlpha = (s + 0.5) / TRAIL_SLICES;
                ctx.lineWidth = 1 + (s / TRAIL_SLICES) * 6;
                ctx.beginPath();
                ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
            }
            ctx.lineTo(trail[i].x, trail[i].y);
        }
        if (slice >= 0) ctx.stroke();
        ctx.shadowBlur = 0;
        for (let i = 1; i < trail.length; i++) {
            const a = trail[i - 1];
            const b = trail[i];
            const k = 1 - (now - b.t) / TRAIL_LIFE;
            ctx.globalAlpha = k;
            ctx.lineWidth = 1 + k * 6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }

        ctx.shadowBlur = 24;
        for (let i = this.slashes.length - 1; i >= 0; i--) {
            const s = this.slashes[i];
            const k = 1 - (now - s.t) / SLASH_LIFE;
            if (k <= 0) {
                this.slashes.splice(i, 1);
                continue;
            }
            ctx.globalAlpha = k;
            ctx.lineWidth = 2 + k * 9;
            ctx.beginPath();
            ctx.moveTo(s.a.x, s.a.y);
            ctx.lineTo(s.b.x, s.b.y);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";

        if (this.sparks.length || this.trail.length || this.slashes.length) this.kick();
    }
}
