import { CONFIG } from "../config.js";
import { Utils } from "../modules/utils.js";
import { icon } from "../modules/icons.js";
import { t } from "../i18n.js";

const template = document.createElement("template");
template.innerHTML = `
<div class="flipper">
    <div class="face front">
        <div class="card-border"></div>
        <div class="card-inner">
            <div class="card-header">
                <div>
                    <div class="stage-label"></div>
                    <div class="card-name"></div>
                </div>
                <div class="card-hp">
                    <span class="hp-label"></span>
                    <span class="hp-value"></span>
                </div>
            </div>

            <div class="card-image-container">
                <!-- AVIF and WebP copies sit next to each JPEG (see the README). Not draggable:
                     a press on the picture must grab the card (card-drag.js). -->
                <picture>
                    <source type="image/avif">
                    <source type="image/webp">
                    <img src="" alt="" class="card-image" draggable="false">
                </picture>
                <!-- A card the visitor has not looked at yet (the "unseen" attribute). -->
                <span class="new-badge" aria-hidden="true"></span>
                <div class="card-art"></div>
            </div>

            <div class="card-body">
                <div class="skill-row row-1">
                    <div class="skill-desc">
                        <h3></h3>
                        <p></p>
                    </div>
                    <div class="damage"></div>
                </div>

                <div class="skill-row row-2">
                    <div class="skill-desc">
                        <h3></h3>
                        <p></p>
                    </div>
                    <div class="action-btn-group"></div>
                </div>
            </div>

            <div class="card-footer">
                <span class="weakness"></span>
                <span class="footer-end">
                    <span class="set-number"></span>
                    <button class="flip-btn" type="button"></button>
                </span>
            </div>
        </div>
        <div class="texture-overlay"></div>
        <div class="holographic-grid"></div>
        <div class="holo-overlay"></div>
        <div class="rare-foil"></div>
        <div class="rare-glitter"></div>
        <div class="gold-etch"></div>
        <div class="secret-prism"></div>
        <div class="glare"></div>
        <div class="glitter-layer"></div>
        <div class="twinkles"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="shine"></div>
    </div>

    <div class="face back">
        <div class="card-border"></div>
        <div class="back-inner">
            <div class="back-mark"></div>
            <div class="back-header">
                <div class="stage-label back-stage"></div>
                <div class="back-title"></div>
            </div>
            <dl class="back-list"></dl>
            <div class="card-footer">
                <span class="back-name"></span>
                <span class="footer-end">
                    <span class="set-number"></span>
                    <button class="flip-btn" type="button"></button>
                </span>
            </div>
        </div>
        <div class="texture-overlay"></div>
        <div class="holo-overlay"></div>
    </div>
</div>
`;

template.content
    .querySelectorAll(".flip-btn")
    .forEach((btn) => btn.appendChild(icon("rotate")));

// Component styles are parsed once into a single constructable stylesheet that
// every <tcg-card> instance adopts, instead of re-parsing a <link> per card.
const SUPPORTS_CONSTRUCTABLE =
    "adoptedStyleSheets" in Document.prototype &&
    "replaceSync" in CSSStyleSheet.prototype;

let sharedSheet = null;
let fallbackCss = "";

// Resolved against the module, not the document, so a sub-path deploy still works.
const sheetReady = fetch(
    new URL("../../css/components/tcg-card.css", import.meta.url)
)
    .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    })
    .then((css) => {
        if (SUPPORTS_CONSTRUCTABLE) {
            sharedSheet = new CSSStyleSheet();
            sharedSheet.replaceSync(css);
        } else {
            fallbackCss = css;
        }
    })
    .catch((err) => {
        console.error(`tcg-card styles failed to load: ${err.message}`);
    });

const COPIED_RESET = 2000;
// The "new" badge stays at least this long (ms) after the card comes to the front, even once
// the card counts as seen: long enough to be noticed.
const NEW_BADGE_MIN = 2000;

/** The cards to collect, for the secret card's counter: every card of the regular sets. */
function collectionSize() {
    return CONFIG.SETS.filter((set) => !set.secret).reduce(
        (n, set) => n + (set.cards ? set.cards.length : Object.keys(set.projects).length),
        0
    );
}

// Every element whose styles read --mx, --my or --glare-opacity (tcg-card.css).
const LIT_LAYERS = [
    ".holo-overlay",
    ".glare",
    ".rare-foil",
    ".rare-glitter",
    ".gold-etch",
    ".secret-prism",
    ".card-border",
    ".card-inner",
    ".back-inner",
    ".card-name",
    ".back-title",
].join(", ");

class TcgCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Cards can be constructed before the stylesheet resolves, and before they are in
        // the document, so each one subscribes instead of being collected afterwards.
        if (!this.applyStyles()) sheetReady.then(() => this.applyStyles());

        this.faces = {
            front: this.shadowRoot.querySelector(".face.front"),
            back: this.shadowRoot.querySelector(".face.back"),
        };
        this.litLayers = [...this.shadowRoot.querySelectorAll(LIT_LAYERS)];
        this.syncFaces();

        // One delegated listener for both flip buttons, and nothing to leak on detach.
        this.shadowRoot.addEventListener("click", (e) => {
            if (e.target.closest(".flip-btn")) {
                e.stopPropagation();
                this.toggleFlip();
            }
        });

        this.shadowRoot
            .querySelector(".shine")
            .addEventListener("animationend", () =>
                this.removeAttribute("shining")
            );
    }

    applyStyles() {
        if (sharedSheet) {
            if (!this.shadowRoot.adoptedStyleSheets.includes(sharedSheet)) {
                this.shadowRoot.adoptedStyleSheets = [
                    ...this.shadowRoot.adoptedStyleSheets,
                    sharedSheet,
                ];
            }
            return true;
        }

        if (fallbackCss) {
            const style = document.createElement("style");
            style.textContent = fallbackCss;
            this.shadowRoot.prepend(style);
            return true;
        }

        return false;
    }

    static get observedAttributes() {
        return ["flipped", "data-pos"];
    }

    attributeChangedCallback(name, before, after) {
        if (name === "flipped") this.syncFaces();
        // When it came to the front: the "new" badge counts its time on screen from there.
        else if (after === "0" && before !== "0") this.frontSince = performance.now();
    }

    set data(data) {
        this._data = data;
        this.render();
    }

    get data() {
        return this._data;
    }

    get hasBack() {
        return Boolean(this._data?.back);
    }

    get flipped() {
        return this.hasAttribute("flipped");
    }

    set flipped(value) {
        this.toggleAttribute("flipped", Boolean(value) && this.hasBack);
    }

    toggleFlip() {
        // The pressed button is about to become inert, so hand focus to its twin.
        const hadFocus = this.shadowRoot.activeElement?.matches(".flip-btn");
        this.flipped = !this.flipped;
        this.dispatchEvent(new CustomEvent("card-flip", { bubbles: true, composed: true }));
        if (hadFocus) {
            const face = this.flipped ? this.faces.back : this.faces.front;
            face.querySelector(".flip-btn").focus();
        }
    }

    // Only the visible face can be focused or read by assistive tech.
    syncFaces() {
        const flipped = this.flipped;
        this.faces.front.inert = flipped;
        this.faces.back.inert = !flipped;
    }

    /**
     * The card has just been looked at: its "new" badge fades away, once it has been on screen
     * NEW_BADGE_MIN since the card came to the front. Instant under reduced motion.
     */
    dismissNew() {
        if (!this.hasAttribute("unseen") || this.newLeaving) return;
        this.newLeaving = true;
        let leave = null;
        const done = () => {
            this.newLeaving = false;
            this.removeAttribute("unseen");
            // Hidden now: the held end frame can go.
            leave?.cancel();
        };
        if (Utils.prefersReducedMotion()) {
            done();
            return;
        }
        const shown = performance.now() - (this.frontSince ?? -Infinity);
        setTimeout(() => {
            // A single, quiet move out: no growing again after the pop in.
            leave = this.shadowRoot
                .querySelector(".new-badge")
                .animate(
                    [
                        { transform: "rotate(-4deg) translateY(0) scale(1)", opacity: 1 },
                        { transform: "rotate(-4deg) translateY(-6px) scale(0.9)", opacity: 0 },
                    ],
                    { duration: 380, easing: "ease-in", fill: "forwards" }
                );
            leave.finished.then(done, done);
        }, Math.max(0, NEW_BADGE_MIN - shown));
    }

    /**
     * One pass of the light sweep over the foil. Restarting the animation needs the attribute
     * to be removed and re-added across a style flush.
     */
    /**
     * Where the light falls (mx, my: percent of the card) and how strong the glare is; any
     * left out stays as it was. Written on the layers that read them (LIT_LAYERS), where they
     * do not inherit (base.css): set on the card, every element in it would restyle on every
     * frame of a tilt.
     */
    setLight({ mx, my, glare }) {
        for (const layer of this.litLayers) {
            if (mx !== undefined) layer.style.setProperty("--mx", `${mx}%`);
            if (my !== undefined) layer.style.setProperty("--my", `${my}%`);
            if (glare !== undefined) layer.style.setProperty("--glare-opacity", `${glare}`);
        }
    }

    playShine() {
        if (Utils.prefersReducedMotion()) return;
        this.removeAttribute("shining");
        void this.offsetWidth;
        this.setAttribute("shining", "");
    }

    render() {
        if (!this._data) return;
        const data = this._data;

        if (data.theme) this.setAttribute("theme", data.theme);
        if (data.brand) this.applyBrand(data.brand);
        // Rare and gold cards wear their own finish (tcg-card.css).
        const rarity = CONFIG.RARITIES[data.rarity];
        if (rarity) this.setAttribute("rarity", data.rarity);
        else this.removeAttribute("rarity");
        const rarityName = rarity ? t(`rarity.${data.rarity}`) : null;
        this.setAttribute("data-id", data.id);
        this.setAttribute("role", "group");
        this.setAttribute("aria-roledescription", "card");
        this.setAttribute(
            "aria-label",
            [data.header.name, data.setLabel, rarityName].filter(Boolean).join(", ")
        );

        this.renderHeader(data);
        this.renderImage(data);
        this.shadowRoot.querySelector(".new-badge").textContent = t("card.new");
        this.renderBody(data);
        this.renderActions(data);
        this.renderFooter(data);
        this.renderBack(data);
    }

    // Expansion cards take their colours from a brand hue instead of a named theme.
    applyBrand(brand) {
        this.style.setProperty("--bg-from", `color-mix(in srgb, ${brand} 28%, #000)`);
        this.style.setProperty("--bg-to", `color-mix(in srgb, ${brand} 70%, #000)`);
        this.style.setProperty("--accent", `color-mix(in srgb, ${brand} 55%, #fff)`);
        this.style.setProperty("--accent-light", `color-mix(in srgb, ${brand} 25%, #fff)`);
    }

    renderHeader(data) {
        this.shadowRoot.querySelector(".stage-label").textContent =
            data.header.stage;
        this.shadowRoot.querySelector(".card-name").textContent =
            data.header.name;
        this.shadowRoot.querySelector(".hp-label").textContent =
            data.header.hpLabel;

        // HP Value logic
        const hpValueContainer = this.shadowRoot.querySelector(".hp-value");
        if (data.header.hpType === "dynamic-exp") {
            const exp = Utils.calculateYearsSince(CONFIG.CAREER_START_DATE);
            hpValueContainer.textContent = t("card.years", { n: exp });
        } else if (data.header.hpType === "dynamic-age") {
            const age = Utils.calculateYearsSince(CONFIG.BIRTH_DATE);
            hpValueContainer.textContent = String(age);
        } else if (data.header.hpType === "collection-count") {
            hpValueContainer.textContent = String(collectionSize());
        } else {
            hpValueContainer.textContent = data.header.hpValue || "";
        }
    }

    renderImage(data) {
        const img = this.shadowRoot.querySelector(".card-image");
        const art = this.shadowRoot.querySelector(".card-art");

        this.toggleAttribute("art", !data.image && Boolean(data.art));
        this.toggleAttribute("no-image", !data.image && !data.art);
        art.replaceChildren(data.art ? icon(data.art.icon) : "");

        const [avif, webp] = this.shadowRoot.querySelectorAll("source");
        if (!data.image) {
            img.removeAttribute("src");
            avif.removeAttribute("srcset");
            webp.removeAttribute("srcset");
            return;
        }

        // The front card's image is the LCP element; the ones behind it can wait.
        const isActive = this.dataset.pos === "0";
        const isJpeg = /\.jpe?g$/i.test(data.image);
        if (isJpeg) {
            avif.srcset = data.image.replace(/\.jpe?g$/i, ".avif");
            webp.srcset = data.image.replace(/\.jpe?g$/i, ".webp");
        } else {
            avif.removeAttribute("srcset");
            webp.removeAttribute("srcset");
        }
        img.src = data.image;
        img.alt = data.header.name;
        img.dataset.card = data.id;
        img.loading = isActive ? "eager" : "lazy";
        img.fetchPriority = isActive ? "high" : "auto";
        img.decoding = isActive ? "auto" : "async";
    }

    renderBody(data) {
        const row1 = this.shadowRoot.querySelector(".row-1");
        row1.querySelector("h3").textContent = data.body.row1.title;
        row1.querySelector("p").textContent = data.body.row1.desc;
        row1.querySelector(".damage").replaceChildren(icon(data.body.row1.icon));

        const row2 = this.shadowRoot.querySelector(".row-2");
        row2.querySelector("h3").textContent = data.body.row2.title;
        row2.querySelector("p").textContent = data.body.row2.desc || "";
    }

    renderActions(data) {
        const container = this.shadowRoot.querySelector(".action-btn-group");
        container.replaceChildren();

        const { actions, links, expansion } = data.body.row2;

        if (expansion) container.appendChild(this.expansionButton(expansion));

        actions?.forEach((key) => {
            const entry = CONFIG.SOCIAL[key];
            if (!entry) {
                console.warn(`Unknown action "${key}"`);
                return;
            }
            const link = this.linkButton(entry);
            container.appendChild(
                entry.copy ? this.withCopyButton(link, entry) : link
            );
        });

        links?.forEach((entry) =>
            container.appendChild(this.linkButton(entry))
        );
    }

    linkButton(entry) {
        const a = document.createElement("a");
        a.href = entry.url;
        a.className = "action-btn";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        // Not draggable: a press on a link must be able to grab the card (card-drag.js).
        a.draggable = false;
        if (entry.brand) a.style.setProperty("--brand", entry.brand);
        a.append(icon(entry.icon), ` ${entry.label}`);

        // Stop propagation on links to prevent card interaction issues
        a.addEventListener("click", (e) => e.stopPropagation());
        return a;
    }

    withCopyButton(link, entry) {
        const wrap = document.createElement("div");
        wrap.className = "action-split";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "action-btn copy-btn";
        if (entry.brand) btn.style.setProperty("--brand", entry.brand);

        const idleLabel = t("card.copy", { label: entry.label.toLowerCase() });
        const setState = (copied) => {
            btn.classList.toggle("copied", copied);
            btn.setAttribute("aria-label", copied ? t("card.copied") : idleLabel);
            btn.title = copied ? t("card.copied") : idleLabel;
            btn.replaceChildren(icon(copied ? "check" : "copy"));
        };
        setState(false);

        let resetTimer = null;
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            Utils.copyText(entry.copy).then(
                () => {
                    setState(true);
                    clearTimeout(resetTimer);
                    resetTimer = setTimeout(() => setState(false), COPIED_RESET);
                },
                (err) => console.error(`Copy failed: ${err.message}`)
            );
        });

        wrap.append(link, btn);
        return wrap;
    }

    expansionButton(expansionId) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "action-btn explore";
        btn.append(icon("book-open"), ` ${t("card.openSet")}`);
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.dispatchEvent(
                new CustomEvent("open-expansion", {
                    detail: { id: expansionId },
                    bubbles: true,
                    composed: true,
                })
            );
        });
        return btn;
    }

    renderFooter(data) {
        this.shadowRoot.querySelector(".weakness").textContent =
            data.footer.text;
        const symbol = CONFIG.RARITIES[data.rarity]?.symbol;
        const label = [symbol, data.setLabel].filter(Boolean).join(" ");
        this.shadowRoot
            .querySelectorAll(".set-number")
            .forEach((el) => (el.textContent = label));
    }

    renderBack(data) {
        this.toggleAttribute("has-back", this.hasBack);
        this.shadowRoot.querySelectorAll(".flip-btn").forEach((btn, i) => {
            const label = t(i === 0 ? "card.showBack" : "card.showFront");
            btn.setAttribute("aria-label", label);
            btn.title = label;
        });

        if (!this.hasBack) {
            this.flipped = false;
            return;
        }

        const { back } = data;
        this.shadowRoot.querySelector(".back-stage").textContent =
            data.header.stage;
        this.shadowRoot.querySelector(".back-title").textContent = back.title;
        this.shadowRoot.querySelector(".back-name").textContent =
            data.header.name;
        this.shadowRoot
            .querySelector(".back-mark")
            .replaceChildren(icon(data.body.row1.icon));

        const list = this.shadowRoot.querySelector(".back-list");
        list.replaceChildren(
            ...back.items.map(({ label, text }) => {
                const item = document.createElement("div");
                item.className = "back-item";
                const dt = document.createElement("dt");
                dt.textContent = label;
                const dd = document.createElement("dd");
                dd.textContent = text;
                item.append(dt, dd);
                return item;
            })
        );
    }
}

customElements.define("tcg-card", TcgCard);
