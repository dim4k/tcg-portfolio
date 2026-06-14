import { SimplexNoise } from "./simplex-noise.js";

// Utility functions
const { PI, cos, sin, abs, sqrt, pow, round, random, atan2 } = Math;
const TAU = 2 * PI;
const rand = (n) => n * random();
const randRange = (n) => n - rand(2 * n);
const fadeInOut = (t, m) => {
    let hm = 0.5 * m;
    return abs(((t + hm) % m) - hm) / hm;
};
const lerp = (n1, n2, speed) => (1 - speed) * n1 + speed * n2;

export class SwirlBackground {
    constructor(canvasId) {
        this.canvasElement = document.getElementById(canvasId);
        if (!this.canvasElement) return;
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
            dark: { base: 0, range: 0 }, // Grayscale
            fire: { base: 0, range: 80 }, // Red-Orange
            electric: { base: 45, range: 30 }, // Yellow
            psychic: { base: 270, range: 40 }, // Purple
            grass: { base: 120, range: 40 }, // Green
            ice: { base: 190, range: 40 }, // Cyan-Blue
            default: { base: 220, range: 100 }, // Blue-Purple
        };

        this.currentTheme = this.themeHues.default;
        this.canvas = {};
        this.ctx = {};
        this.center = [];
        this.tick = 0;
        this.isEnabled = true;
        this.intendedEnabled = true;
        this.rafId = null;
        this.resizeTimeout = null;

        this.init();
    }

    init() {
        this.createCanvas();
        this.resize();
        this.initParticles();
        this.bindEvents();
        this.draw();
    }

    bindEvents() {
        // Keep the canvas in sync with the viewport (debounced).
        window.addEventListener("resize", () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.resize(), 150);
        });

        // Pause rendering when the tab is hidden to save CPU/battery.
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                this.stop();
            } else if (this.intendedEnabled) {
                this.start();
            }
        });
    }

    createCanvas() {
        this.canvas.a = document.createElement("canvas");
        this.canvas.b = this.canvasElement;
        this.canvas.b.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        `;
        this.ctx.a = this.canvas.a.getContext("2d");
        this.ctx.b = this.canvas.b.getContext("2d");
    }

    resize() {
        const { innerWidth, innerHeight } = window;

        this.canvas.a.width = innerWidth;
        this.canvas.a.height = innerHeight;
        this.ctx.a.drawImage(this.canvas.b, 0, 0);

        this.canvas.b.width = innerWidth;
        this.canvas.b.height = innerHeight;
        this.ctx.b.drawImage(this.canvas.a, 0, 0);

        this.center[0] = 0.5 * this.canvas.a.width;
        this.center[1] = 0.5 * this.canvas.a.height;
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
        const x = rand(this.canvas.a.width);
        const y = this.center[1] + randRange(this.rangeY);
        const vx = 0;
        const vy = 0;
        const life = 0;
        const ttl = this.baseTTL + rand(this.rangeTTL);
        const speed = this.baseSpeed + rand(this.rangeSpeed);
        const radius = this.baseRadius + rand(this.rangeRadius);
        const hue = this.currentTheme.base + rand(this.currentTheme.range);

        this.particleProps.set(
            [x, y, vx, vy, life, ttl, speed, radius, hue],
            i
        );
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

        if (this.checkBounds(x, y) || life > ttl) {
            this.initParticle(i);
        }
    }

    drawParticle(x, y, x2, y2, life, ttl, radius, hue) {
        this.ctx.a.save();
        this.ctx.a.lineCap = "round";
        this.ctx.a.lineWidth = radius;
        const saturation = hue === 0 ? 0 : 100;
        this.ctx.a.strokeStyle = `hsla(${hue},${saturation}%,60%,${
            fadeInOut(life, ttl) * 0.5
        })`;
        this.ctx.a.beginPath();
        this.ctx.a.moveTo(x, y);
        this.ctx.a.lineTo(x2, y2);
        this.ctx.a.stroke();
        this.ctx.a.closePath();
        this.ctx.a.restore();
    }

    checkBounds(x, y) {
        return (
            x > this.canvas.a.width ||
            x < 0 ||
            y > this.canvas.a.height ||
            y < 0
        );
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

    renderGlow() {
        this.ctx.b.save();
        this.ctx.b.filter = "blur(8px) brightness(150%)";
        this.ctx.b.globalCompositeOperation = "lighter";
        this.ctx.b.drawImage(this.canvas.a, 0, 0);
        this.ctx.b.restore();

        this.ctx.b.save();
        this.ctx.b.filter = "blur(4px) brightness(150%)";
        this.ctx.b.globalCompositeOperation = "lighter";
        this.ctx.b.drawImage(this.canvas.a, 0, 0);
        this.ctx.b.restore();
    }

    renderToScreen() {
        this.ctx.b.save();
        this.ctx.b.globalCompositeOperation = "lighter";
        this.ctx.b.drawImage(this.canvas.a, 0, 0);
        this.ctx.b.restore();
    }

    draw() {
        if (!this.isEnabled) return;

        this.tick++;

        this.ctx.a.clearRect(0, 0, this.canvas.a.width, this.canvas.a.height);
        this.ctx.b.fillStyle = "hsla(0,0%,5%,1)";
        this.ctx.b.fillRect(0, 0, this.canvas.a.width, this.canvas.a.height);

        this.drawParticles();
        this.renderGlow();
        this.renderToScreen();

        this.rafId = requestAnimationFrame(() => this.draw());
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

    start() {
        if (this.rafId !== null) return; // already running
        this.isEnabled = true;
        this.draw();
    }

    stop() {
        this.isEnabled = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    enable() {
        this.intendedEnabled = true;
        if (!document.hidden) this.start();
    }

    disable() {
        this.intendedEnabled = false;
        this.stop();
        this.ctx.b.clearRect(0, 0, this.canvas.b.width, this.canvas.b.height);
    }
}

