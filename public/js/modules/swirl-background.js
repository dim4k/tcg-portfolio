import { SimplexNoise } from "./simplex-noise.js";

// Utility functions
const { PI, cos, sin, abs, random } = Math;
const TAU = 2 * PI;
const rand = (n) => n * random();
const randRange = (n) => n - rand(2 * n);
const fadeInOut = (t, m) => {
    let hm = 0.5 * m;
    return abs(((t + hm) % m) - hm) / hm;
};
const lerp = (n1, n2, speed) => (1 - speed) * n1 + speed * n2;

const BACKDROP = "hsla(0,0%,5%,1)";
// Compensates for the two additive glow passes the renderer used to composite per frame.
const PARTICLE_ALPHA = 1;
const HUE_STEPS = 360;
const ALPHA_STEPS = 32;

// Quantized colour cache: without it a fresh hsla() string is allocated and re-parsed
// for every particle of every frame (~9k allocations/s).
const colorLut = new Array(HUE_STEPS * ALPHA_STEPS);
const grayLut = new Array(ALPHA_STEPS);

function strokeColor(hue, saturated, alpha) {
    let a = (alpha * ALPHA_STEPS) | 0;
    if (a < 0) a = 0;
    else if (a >= ALPHA_STEPS) a = ALPHA_STEPS - 1;
    const quantized = (a + 0.5) / ALPHA_STEPS;

    if (!saturated) {
        return (grayLut[a] ??= `hsla(0,0%,60%,${quantized})`);
    }

    const h = (((hue | 0) % HUE_STEPS) + HUE_STEPS) % HUE_STEPS;
    const idx = h * ALPHA_STEPS + a;
    return (colorLut[idx] ??= `hsla(${h},100%,60%,${quantized})`);
}

export class SwirlBackground {
    static create(canvasId) {
        const canvas = document.getElementById(canvasId);
        return canvas ? new SwirlBackground(canvas) : null;
    }

    constructor(canvas) {
        this.canvas = canvas;
        // Configuration
        this.particleCount = 150;
        this.particlePropCount = 9;
        this.particlePropsLength = this.particleCount * this.particlePropCount;
        this.rangeY = 200;
        this.baseTTL = 50;
        this.rangeTTL = 150;
        this.baseSpeed = 0.1;
        this.rangeSpeed = 1;
        this.baseRadius = 0.9;
        this.rangeRadius = 2;
        this.noiseSteps = 20;
        this.xOff = 0.00125;
        this.yOff = 0.00125;
        this.zOff = 0.0005;

        // Theme colors (hue values)
        this.themeHues = {
            dark: { base: 0, range: 0, saturated: false }, // Grayscale
            fire: { base: 0, range: 80, saturated: true }, // Red-Orange
            electric: { base: 45, range: 30, saturated: true }, // Yellow
            psychic: { base: 270, range: 40, saturated: true }, // Purple
            grass: { base: 120, range: 40, saturated: true }, // Green
            ice: { base: 190, range: 40, saturated: true }, // Cyan-Blue
            default: { base: 220, range: 100, saturated: true }, // Blue-Purple
        };

        this.currentTheme = this.themeHues.default;
        this.ctx = null;
        this.center = [0, 0];
        this.tick = 0;
        this.wanted = true;
        this.rafId = null;
        this.resizeTimeout = null;
        this.boundDraw = () => this.draw();

        this.init();
    }

    init() {
        // Opaque: the whole surface is repainted with BACKDROP every frame.
        this.ctx = this.canvas.getContext("2d", { alpha: false });
        this.resize();
        this.initParticles();
        this.bindEvents();
        this.sync();
    }

    bindEvents() {
        // Keep the canvas in sync with the viewport (debounced).
        window.addEventListener("resize", () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.resize(), 150);
        });

        // Pause rendering when the tab is hidden to save CPU/battery.
        document.addEventListener("visibilitychange", () => this.sync());
    }

    resize() {
        const { innerWidth, innerHeight } = window;

        // Deliberately CSS-pixel sized: the output is blurred by the compositor, so a
        // devicePixelRatio backing store would cost up to 4x the fill rate for no visible gain.
        this.canvas.width = innerWidth;
        this.canvas.height = innerHeight;

        this.center[0] = 0.5 * innerWidth;
        this.center[1] = 0.5 * innerHeight;
    }

    initParticles() {
        this.tick = 0;
        this.simplex = new SimplexNoise();
        this.particleProps = new Float32Array(this.particlePropsLength);

        for (
            let i = 0;
            i < this.particlePropsLength;
            i += this.particlePropCount
        ) {
            this.initParticle(i);
        }
    }

    initParticle(i) {
        const props = this.particleProps;
        props[i] = rand(this.canvas.width);
        props[i + 1] = this.center[1] + randRange(this.rangeY);
        props[i + 2] = 0; // vx
        props[i + 3] = 0; // vy
        props[i + 4] = 0; // life
        props[i + 5] = this.baseTTL + rand(this.rangeTTL);
        props[i + 6] = this.baseSpeed + rand(this.rangeSpeed);
        props[i + 7] = this.baseRadius + rand(this.rangeRadius);
        props[i + 8] = this.currentTheme.base + rand(this.currentTheme.range);
    }

    updateParticle(i) {
        const i2 = 1 + i,
            i3 = 2 + i,
            i4 = 3 + i,
            i5 = 4 + i;
        const i6 = 5 + i,
            i7 = 6 + i,
            i8 = 7 + i,
            i9 = 8 + i;

        const x = this.particleProps[i];
        const y = this.particleProps[i2];
        const n =
            this.simplex.noise3D(
                x * this.xOff,
                y * this.yOff,
                this.tick * this.zOff
            ) *
            this.noiseSteps *
            TAU;
        const vx = lerp(this.particleProps[i3], cos(n), 0.5);
        const vy = lerp(this.particleProps[i4], sin(n), 0.5);
        let life = this.particleProps[i5];
        const ttl = this.particleProps[i6];
        const speed = this.particleProps[i7];
        const x2 = x + vx * speed;
        const y2 = y + vy * speed;
        const radius = this.particleProps[i8];
        const hue = this.particleProps[i9];

        this.drawParticle(x, y, x2, y2, life, ttl, radius, hue);

        life++;

        this.particleProps[i] = x2;
        this.particleProps[i2] = y2;
        this.particleProps[i3] = vx;
        this.particleProps[i4] = vy;
        this.particleProps[i5] = life;

        if (this.checkBounds(x2, y2) || life > ttl) {
            this.initParticle(i);
        }
    }

    // lineCap and the composite mode are set once per frame in draw().
    drawParticle(x, y, x2, y2, life, ttl, radius, hue) {
        const ctx = this.ctx;
        ctx.lineWidth = radius;
        ctx.strokeStyle = strokeColor(
            hue,
            this.currentTheme.saturated,
            fadeInOut(life, ttl) * PARTICLE_ALPHA
        );
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    checkBounds(x, y) {
        return x > this.canvas.width || x < 0 || y > this.canvas.height || y < 0;
    }

    drawParticles() {
        for (
            let i = 0;
            i < this.particlePropsLength;
            i += this.particlePropCount
        ) {
            this.updateParticle(i);
        }
    }

    // The glow used to be two full-screen ctx.filter blur passes per frame; it is now a single
    // CSS filter on the canvas element (see #canvas-background in base.css).
    draw() {
        this.tick++;

        const ctx = this.ctx;
        const { width, height } = this.canvas;

        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = BACKDROP;
        ctx.fillRect(0, 0, width, height);

        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        this.drawParticles();

        this.rafId = requestAnimationFrame(this.boundDraw);
    }

    setTheme(theme) {
        const targetTheme = this.themeHues[theme] || this.themeHues.default;
        this.currentTheme = targetTheme;

        // Update existing particles gradually
        for (
            let i = 0;
            i < this.particlePropsLength;
            i += this.particlePropCount
        ) {
            const i9 = 8 + i;
            const newHue = targetTheme.base + rand(targetTheme.range);
            this.particleProps[i9] = newHue;
        }
    }

    // Single source of truth for "should the loop be running".
    sync() {
        const shouldRun = this.wanted && !document.hidden;

        if (shouldRun && this.rafId === null) {
            this.rafId = requestAnimationFrame(this.boundDraw);
        } else if (!shouldRun && this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    enable() {
        this.wanted = true;
        this.canvas.classList.remove("is-paused");
        this.sync();
    }

    disable() {
        this.wanted = false;
        // display:none drops the composited layer entirely, unlike clearing the pixels.
        this.canvas.classList.add("is-paused");
        this.sync();
    }
}

