import { CONFIG } from "../config.js";
import { Utils } from "../modules/utils.js";
import { icon } from "../modules/icons.js";

const template = document.createElement("template");
template.innerHTML = `
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
        <img src="" alt="" class="card-image">
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
        <div class="weakness"></div>
        <div class="theme-switcher"></div>
    </div>
</div>
<div class="texture-overlay"></div>
<div class="holographic-grid"></div>
<div class="holo-overlay"></div>
<div class="glare"></div>
<div class="glitter-layer"></div>
`;

// Theme switcher buttons generated from the single source of truth (CONFIG.THEMES).
const themeSwitcher = template.content.querySelector(".theme-switcher");
CONFIG.THEMES.forEach((theme) => {
    const btn = document.createElement("button");
    btn.className = "theme-btn";
    btn.dataset.theme = theme.id;
    btn.title = theme.label;
    btn.setAttribute("aria-label", `${theme.label} theme`);
    btn.setAttribute("aria-pressed", "false");
    btn.appendChild(icon(theme.icon));
    themeSwitcher.appendChild(btn);
});

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

class TcgCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Cards can be constructed before the stylesheet resolves, and before they are in
        // the document, so each one subscribes instead of being collected afterwards.
        if (!this.applyStyles()) sheetReady.then(() => this.applyStyles());

        // One delegated listener instead of six per card, and nothing to leak on detach.
        this.shadowRoot
            .querySelector(".theme-switcher")
            .addEventListener("click", (e) => this.handleThemeClick(e));
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
        return ["theme"];
    }

    attributeChangedCallback(name) {
        if (name === "theme") {
            this.syncThemeButtons();
        }
    }

    syncThemeButtons() {
        const current = this.getAttribute("theme");
        this.shadowRoot.querySelectorAll(".theme-btn").forEach((btn) => {
            btn.setAttribute(
                "aria-pressed",
                String(btn.dataset.theme === current)
            );
        });
    }

    set data(data) {
        this._data = data;
        this.render();
    }

    get data() {
        return this._data;
    }

    handleThemeClick(e) {
        const btn = e.target.closest(".theme-btn");
        if (!btn) return;

        e.stopPropagation(); // Prevent card click
        const theme = btn.dataset.theme;
        this.setAttribute("theme", theme);
        this.dispatchEvent(
            new CustomEvent("theme-change", {
                detail: { theme },
                bubbles: true,
                composed: true,
            })
        );
    }

    render() {
        if (!this._data) return;
        const data = this._data;

        // Set theme
        this.setAttribute("theme", data.theme);
        this.setAttribute("data-id", data.id);

        this.renderHeader(data);
        this.renderImage(data);
        this.renderBody(data);
        this.renderActions(data);
        this.renderFooter(data);
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
            hpValueContainer.innerHTML = `<span id="dynamic-exp">${exp}</span>Y`;
        } else if (data.header.hpType === "dynamic-age") {
            const age = Utils.calculateYearsSince(CONFIG.BIRTH_DATE);
            hpValueContainer.innerHTML = `<span id="dynamic-age">${age}</span>`;
        } else {
            hpValueContainer.textContent = data.header.hpValue || "";
        }
    }

    renderImage(data) {
        const img = this.shadowRoot.querySelector(".card-image");
        // The front card's image is the LCP element; the ones behind it can wait.
        const isActive = this.dataset.pos === "0";
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
        row2.querySelector("p").textContent = data.body.row2.desc;
    }

    renderActions(data) {
        const actionsContainer =
            this.shadowRoot.querySelector(".action-btn-group");
        actionsContainer.innerHTML = "";
        if (!data.body.row2.actions) return;

        data.body.row2.actions.forEach((actionKey) => {
            const social = CONFIG.SOCIAL[actionKey];
            if (!social) {
                console.warn(`Unknown social action "${actionKey}"`);
                return;
            }

            const a = document.createElement("a");
            a.href = social.url;
            a.className = `action-btn ${social.class}`;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.append(icon(social.icon), ` ${social.label}`);
            // Stop propagation on links to prevent card interaction issues
            a.addEventListener("click", (e) => e.stopPropagation());
            actionsContainer.appendChild(a);
        });
    }

    renderFooter(data) {
        this.shadowRoot.querySelector(".weakness").textContent =
            data.footer.text;
    }
}

customElements.define("tcg-card", TcgCard);
