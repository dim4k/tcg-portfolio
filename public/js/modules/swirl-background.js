window.TCG = window.TCG || {};

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

// SimplexNoise (minified version from noise.min.js)
// We keep it in module scope so it doesn't pollute window
const SimplexNoise = (function () {
    "use strict";
    var r = 0.5 * (Math.sqrt(3) - 1),
        e = (3 - Math.sqrt(3)) / 6,
        t = 1 / 6,
        a = (Math.sqrt(5) - 1) / 4,
        o = (5 - Math.sqrt(5)) / 20;
    function i(r) {
        var e;
        (e =
            "function" == typeof r
                ? r
                : r
                ? (function () {
                      var r = 0,
                          e = 0,
                          t = 0,
                          a = 1,
                          o =
                              ((i = 4022871197),
                              function (r) {
                                  r = r.toString();
                                  for (var e = 0; e < r.length; e++) {
                                      var t =
                                          0.02519603282416938 *
                                          (i += r.charCodeAt(e));
                                      (t -= i = t >>> 0),
                                          (i = (t *= i) >>> 0),
                                          (i += 4294967296 * (t -= i));
                                  }
                                  return 2.3283064365386963e-10 * (i >>> 0);
                              });
                      var i;
                      (r = o(" ")), (e = o(" ")), (t = o(" "));
                      for (var n = 0; n < arguments.length; n++)
                          (r -= o(arguments[n])) < 0 && (r += 1),
                              (e -= o(arguments[n])) < 0 && (e += 1),
                              (t -= o(arguments[n])) < 0 && (t += 1);
                      return (
                          (o = null),
                          function () {
                              var o = 2091639 * r + 2.3283064365386963e-10 * a;
                              return (r = e), (e = t), (t = o - (a = 0 | o));
                          }
                      );
                  })(r)
                : Math.random),
            (this.p = n(e)),
            (this.perm = new Uint8Array(512)),
            (this.permMod12 = new Uint8Array(512));
        for (var t = 0; t < 512; t++)
            (this.perm[t] = this.p[255 & t]),
                (this.permMod12[t] = this.perm[t] % 12);
    }
    function n(r) {
        var e,
            t = new Uint8Array(256);
        for (e = 0; e < 256; e++) t[e] = e;
        for (e = 0; e < 255; e++) {
            var a = e + ~~(r() * (256 - e)),
                o = t[e];
            (t[e] = t[a]), (t[a] = o);
        }
        return t;
    }
    (i.prototype = {
        grad3: new Float32Array([
            1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1,
            -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
        ]),
        grad4: new Float32Array([
            0, 1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, -1, 1, 1, 0,
            -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 1, 0, 1, 1, 1, 0, 1, -1, 1,
            0, -1, 1, 1, 0, -1, -1, -1, 0, 1, 1, -1, 0, 1, -1, -1, 0, -1, 1, -1,
            0, -1, -1, 1, 1, 0, 1, 1, 1, 0, -1, 1, -1, 0, 1, 1, -1, 0, -1, -1,
            1, 0, 1, -1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1, 1, 1, 1, 0, 1,
            1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, -1, 1, 1, 0, -1, 1, -1, 0, -1,
            -1, 1, 0, -1, -1, -1, 0,
        ]),
        noise2D: function (t, a) {
            var o,
                i,
                n = this.permMod12,
                f = this.perm,
                s = this.grad3,
                v = 0,
                h = 0,
                l = 0,
                u = (t + a) * r,
                d = Math.floor(t + u),
                p = Math.floor(a + u),
                M = (d + p) * e,
                m = t - (d - M),
                c = a - (p - M);
            m > c ? ((o = 1), (i = 0)) : ((o = 0), (i = 1));
            var y = m - o + e,
                w = c - i + e,
                g = m - 1 + 2 * e,
                A = c - 1 + 2 * e,
                x = 255 & d,
                q = 255 & p,
                D = 0.5 - m * m - c * c;
            if (D >= 0) {
                var S = 3 * n[x + f[q]];
                v = (D *= D) * D * (s[S] * m + s[S + 1] * c);
            }
            var U = 0.5 - y * y - w * w;
            if (U >= 0) {
                var b = 3 * n[x + o + f[q + i]];
                h = (U *= U) * U * (s[b] * y + s[b + 1] * w);
            }
            var F = 0.5 - g * g - A * A;
            if (F >= 0) {
                var N = 3 * n[x + 1 + f[q + 1]];
                l = (F *= F) * F * (s[N] * g + s[N + 1] * A);
            }
            return 70 * (v + h + l);
        },
        noise3D: function (r, e, a) {
            var o,
                i,
                n,
                f,
                s,
                v,
                h,
                l,
                u,
                d,
                p = this.permMod12,
                M = this.perm,
                m = this.grad3,
                c = (r + e + a) * (1 / 3),
                y = Math.floor(r + c),
                w = Math.floor(e + c),
                g = Math.floor(a + c),
                A = (y + w + g) * t,
                x = r - (y - A),
                q = e - (w - A),
                D = a - (g - A);
            x >= q
                ? q >= D
                    ? ((s = 1), (v = 0), (h = 0), (l = 1), (u = 1), (d = 0))
                    : x >= D
                    ? ((s = 1), (v = 0), (h = 0), (l = 1), (u = 0), (d = 1))
                    : ((s = 0), (v = 0), (h = 1), (l = 1), (u = 0), (d = 1))
                : q < D
                ? ((s = 0), (v = 0), (h = 1), (l = 0), (u = 1), (d = 1))
                : x < D
                ? ((s = 0), (v = 1), (h = 0), (l = 0), (u = 1), (d = 1))
                : ((s = 0), (v = 1), (h = 0), (l = 1), (u = 1), (d = 0));
            var S = x - s + t,
                U = q - v + t,
                b = D - h + t,
                F = x - l + 2 * t,
                N = q - u + 2 * t,
                C = D - d + 2 * t,
                P = x - 1 + 0.5,
                T = q - 1 + 0.5,
                _ = D - 1 + 0.5,
                j = 255 & y,
                k = 255 & w,
                z = 255 & g,
                B = 0.6 - x * x - q * q - D * D;
            if (B < 0) o = 0;
            else {
                var E = 3 * p[j + M[k + M[z]]];
                o = (B *= B) * B * (m[E] * x + m[E + 1] * q + m[E + 2] * D);
            }
            var G = 0.6 - S * S - U * U - b * b;
            if (G < 0) i = 0;
            else {
                var H = 3 * p[j + s + M[k + v + M[z + h]]];
                i = (G *= G) * G * (m[H] * S + m[H + 1] * U + m[H + 2] * b);
            }
            var I = 0.6 - F * F - N * N - C * C;
            if (I < 0) n = 0;
            else {
                var J = 3 * p[j + l + M[k + u + M[z + d]]];
                n = (I *= I) * I * (m[J] * F + m[J + 1] * N + m[J + 2] * C);
            }
            var K = 0.6 - P * P - T * T - _ * _;
            if (K < 0) f = 0;
            else {
                var L = 3 * p[j + 1 + M[k + 1 + M[z + 1]]];
                f = (K *= K) * K * (m[L] * P + m[L + 1] * T + m[L + 2] * _);
            }
            return 32 * (o + i + n + f);
        },
        noise4D: function (r, e, t, i) {
            var n,
                f,
                s,
                v,
                h,
                l,
                u,
                d,
                p,
                M,
                m,
                c,
                y,
                w,
                g,
                A,
                x,
                q = this.perm,
                D = this.grad4,
                S = (r + e + t + i) * a,
                U = Math.floor(r + S),
                b = Math.floor(e + S),
                F = Math.floor(t + S),
                N = Math.floor(i + S),
                C = (U + b + F + N) * o,
                P = r - (U - C),
                T = e - (b - C),
                _ = t - (F - C),
                j = i - (N - C),
                k = 0,
                z = 0,
                B = 0,
                E = 0;
            P > T ? k++ : z++,
                P > _ ? k++ : B++,
                P > j ? k++ : E++,
                T > _ ? z++ : B++,
                T > j ? z++ : E++,
                _ > j ? B++ : E++;
            var G = P - (l = k >= 3 ? 1 : 0) + o,
                H = T - (u = z >= 3 ? 1 : 0) + o,
                I = _ - (d = B >= 3 ? 1 : 0) + o,
                J = j - (p = E >= 3 ? 1 : 0) + o,
                K = P - (M = k >= 2 ? 1 : 0) + 2 * o,
                L = T - (m = z >= 2 ? 1 : 0) + 2 * o,
                O = _ - (c = B >= 2 ? 1 : 0) + 2 * o,
                Q = j - (y = E >= 2 ? 1 : 0) + 2 * o,
                R = P - (w = k >= 1 ? 1 : 0) + 3 * o,
                V = T - (g = z >= 1 ? 1 : 0) + 3 * o,
                W = _ - (A = B >= 1 ? 1 : 0) + 3 * o,
                X = j - (x = E >= 1 ? 1 : 0) + 3 * o,
                Y = P - 1 + 4 * o,
                Z = T - 1 + 4 * o,
                $ = _ - 1 + 4 * o,
                rr = j - 1 + 4 * o,
                er = 255 & U,
                tr = 255 & b,
                ar = 255 & F,
                or = 255 & N,
                ir = 0.6 - P * P - T * T - _ * _ - j * j;
            if (ir < 0) n = 0;
            else {
                var nr = (q[er + q[tr + q[ar + q[or]]]] % 32) * 4;
                n =
                    (ir *= ir) *
                    ir *
                    (D[nr] * P + D[nr + 1] * T + D[nr + 2] * _ + D[nr + 3] * j);
            }
            var fr = 0.6 - G * G - H * H - I * I - J * J;
            if (fr < 0) f = 0;
            else {
                var sr =
                    (q[er + l + q[tr + u + q[ar + d + q[or + p]]]] % 32) * 4;
                f =
                    (fr *= fr) *
                    fr *
                    (D[sr] * G + D[sr + 1] * H + D[sr + 2] * I + D[sr + 3] * J);
            }
            var vr = 0.6 - K * K - L * L - O * O - Q * Q;
            if (vr < 0) s = 0;
            else {
                var hr =
                    (q[er + M + q[tr + m + q[ar + c + q[or + y]]]] % 32) * 4;
                s =
                    (vr *= vr) *
                    vr *
                    (D[hr] * K + D[hr + 1] * L + D[hr + 2] * O + D[hr + 3] * Q);
            }
            var lr = 0.6 - R * R - V * V - W * W - X * X;
            if (lr < 0) v = 0;
            else {
                var ur =
                    (q[er + w + q[tr + g + q[ar + A + q[or + x]]]] % 32) * 4;
                v =
                    (lr *= lr) *
                    lr *
                    (D[ur] * R + D[ur + 1] * V + D[ur + 2] * W + D[ur + 3] * X);
            }
            var dr = 0.6 - Y * Y - Z * Z - $ * $ - rr * rr;
            if (dr < 0) h = 0;
            else {
                var pr =
                    (q[er + 1 + q[tr + 1 + q[ar + 1 + q[or + 1]]]] % 32) * 4;
                h =
                    (dr *= dr) *
                    dr *
                    (D[pr] * Y +
                        D[pr + 1] * Z +
                        D[pr + 2] * $ +
                        D[pr + 3] * rr);
            }
            return 27 * (n + f + s + v + h);
        },
    }),
        (i._buildPermutationTable = n),
        "undefined" != typeof define &&
            define.amd &&
            define(function () {
                return i;
            }),
        "undefined" != typeof exports
            ? (exports.SimplexNoise = i)
            : "undefined" != typeof window && (window.SimplexNoise = i),
        "undefined" != typeof module && (module.exports = i);
    return i;
})();

window.TCG.SwirlBackground = class SwirlBackground {
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

        this.init();
    }

    init() {
        this.createCanvas();
        this.resize();
        this.initParticles();
        this.draw();
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

        requestAnimationFrame(() => this.draw());
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

    enable() {
        this.isEnabled = true;
        this.draw();
    }

    disable() {
        this.isEnabled = false;
        this.ctx.b.clearRect(0, 0, this.canvas.b.width, this.canvas.b.height);
    }
};
