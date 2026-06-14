import { CONFIG } from "../config.js";
import { Utils } from "../modules/utils.js";

// Theme switcher buttons generated from the single source of truth (CONFIG.THEMES).
const themeButtons = CONFIG.THEMES.map(
    (t) =>
        `<button class="theme-btn" data-theme="${t.id}" title="${t.label}" aria-label="${t.label} theme" aria-pressed="false"><i class="${t.icon}"></i></button>`
).join("");

const template = document.createElement("template");
template.innerHTML = `
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
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
            <div class="damage"><i></i></div>
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
        <div class="theme-switcher">${themeButtons}</div>
    </div>
</div>
<div class="texture-overlay"></div>
<div class="holographic-grid"></div>
<div class="holo-overlay"></div>
<div class="glare"></div>
<div class="glitter-layer"></div>
`;

// Component styles are parsed once into a single constructable stylesheet that
// every <tcg-card> instance adopts, instead of re-parsing a <link> per card.
// (Font Awesome stays a <link> so its relative font url()s resolve correctly.)
let sharedSheet = null;
fetch("public/css/components/tcg-card.css")
    .then((r) => r.text())
    .then((css) => {
        sharedSheet = new CSSStyleSheet();
        sharedSheet.replaceSync(css);
        // Adopt into any cards created before the sheet finished loading.
        document
            .querySelectorAll("tcg-card")
            .forEach((card) => card.adoptSharedSheet());
    })
    .catch(() => {});

class TcgCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.adoptSharedSheet();
    }

    adoptSharedSheet() {
        if (
            sharedSheet &&
            !this.shadowRoot.adoptedStyleSheets.includes(sharedSheet)
        ) {
            this.shadowRoot.adoptedStyleSheets = [
                ...this.shadowRoot.adoptedStyleSheets,
                sharedSheet,
            ];
        }
    }

    static get observedAttributes() {
        return ["theme", "data-pos"];
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

    connectedCallback() {
        this.setupThemeSwitcher();
    }

    setupThemeSwitcher() {
        const buttons = this.shadowRoot.querySelectorAll(".theme-btn");
        buttons.forEach((btn) => {
            btn.addEventListener("click", (e) => {
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
            });
        });
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
        img.src = data.image;
        img.alt = data.header.name;
        img.dataset.card = data.id;
        img.loading = "lazy";
        img.decoding = "async";
    }

    renderBody(data) {
        const row1 = this.shadowRoot.querySelector(".row-1");
        row1.querySelector("h3").textContent = data.body.row1.title;
        row1.querySelector("p").textContent = data.body.row1.desc;
        row1.querySelector(".damage i").className = data.body.row1.icon;

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
            const a = document.createElement("a");
            a.href = social.url;
            a.className = `action-btn ${social.class}`;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.innerHTML = `<i class="${social.icon}"></i> ${social.label}`;
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
