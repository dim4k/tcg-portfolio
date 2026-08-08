// SimplexNoise — minified implementation extracted from noise.min.js.
// Pruned to what this project uses: noise3D only (2D/4D, the string seeder and the UMD tail removed).
const SimplexNoise = (function () {
    "use strict";
    var t = 1 / 6;
    function i(random) {
        this.p = n("function" == typeof random ? random : Math.random);
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        for (var k = 0; k < 512; k++) {
            this.perm[k] = this.p[255 & k];
            this.permMod12[k] = this.perm[k] % 12;
        }
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
    });
    return i;
})();

export { SimplexNoise };
