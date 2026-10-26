import { CONFIG } from "../config.js";
import { setCards } from "./card-renderer.js";

/** "#1d1757" -> [29, 23, 87] */
function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
}

/**
 * Colours of a set's pack as inline custom properties, read by the pack styles in index.html.
 * The set name is printed in the highlight colour on a dark wrapper, in white on a bright one.
 */
export function packStyle(set) {
    const { color, highlight } = set.booster;
    const [r, g, b] = rgb(color);
    const dark = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.35;
    return [
        `--flat: ${color}`,
        `--hi: ${highlight}`,
        `--glow: ${rgb(highlight).join(", ")}`,
        `--name: ${dark ? highlight : "#fff"}`,
    ].join("; ");
}

/**
 * Size of the set name on the pack, in cqw: as large as the design wants, smaller when its
 * longest word would not fit the 80% of the pack's width left by its margins (a letter of
 * Unbounded Black is about 0.85em wide).
 */
function nameSize(name) {
    const longest = Math.max(...name.split(" ").map((word) => word.length));
    return Math.min(15, 80 / (longest * 0.85)).toFixed(1);
}

/** What the pack promises, from the rarities of its cards: "1 gold + 2 rares". */
function rarityLine(cards) {
    const parts = Object.entries(CONFIG.RARITIES)
        .map(([key, rarity]) => {
            const n = cards.filter((card) => card.rarity === key).length;
            const label = rarity.label.toLowerCase();
            return n ? `${n} ${label}${n > 1 && key !== "gold" ? "s" : ""}` : "";
        })
        .filter(Boolean)
        .reverse();
    return parts.length ? parts.join(" + ") : "All common";
}

/** Inside of a pack (wrapper strip and printed body), for any set of CONFIG.SETS. */
export function packMarkup(set) {
    const series = String(CONFIG.SETS.indexOf(set) + 1).padStart(2, "0");
    const cards = setCards(set);
    const count = cards.length;
    return `
        <span class="pack-strip"></span>
        <span class="pack-body">
            <span class="pack-art">
                <span class="pack-code">${set.code}</span>
                <span class="pack-band"></span>
                <span class="pack-head"><span>TCG Portfolio</span><span>Series ${series}</span></span>
                <span class="pack-name" style="font-size: ${nameSize(set.name)}cqw">${set.name.split(" ").join("<br />")}</span>
                <span class="pack-foot">
                    <span class="pack-stamp">1st<br />Ed.</span>
                    <span class="pack-info">${count} cards<br />${rarityLine(cards)}</span>
                    <span class="pack-bar"></span>
                </span>
            </span>
            <span class="pack-layer pack-wrinkles"></span>
            <span class="pack-layer pack-foil"></span>
            <span class="pack-layer pack-shade"></span>
            <span class="pack-layer pack-glare"></span>
            <span class="pack-layer pack-crimp"></span>
        </span>`;
}
