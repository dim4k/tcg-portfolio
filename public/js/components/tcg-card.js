window.TCG = window.TCG || {};

const template = document.createElement("template");
template.innerHTML = `
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
<link rel="stylesheet" href="public/css/components/tcg-card.css">
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
        
        <div class="skill-row row-2" style="flex-direction: column; align-items: flex-start;">
            <div class="skill-desc">
                <h3></h3>
                <p></p>
            </div>
            <div class="action-btn-group"></div>
        </div>
    </div>

    <div class="card-footer">
        <div class="weakness"></div>
        <div class="theme-switcher">
            <button class="theme-btn" data-theme="dark" title="Dark"><i class="fas fa-circle"></i></button>
            <button class="theme-btn" data-theme="ice" title="Ice"><i class="fas fa-snowflake"></i></button>
            <button class="theme-btn" data-theme="fire" title="Fire"><i class="fas fa-fire"></i></button>
            <button class="theme-btn" data-theme="electric" title="Electric"><i class="fas fa-bolt"></i></button>
            <button class="theme-btn" data-theme="psychic" title="Psychic"><i class="fas fa-moon"></i></button>
            <button class="theme-btn" data-theme="grass" title="Grass"><i class="fas fa-leaf"></i></button>
        </div>
    </div>
</div>
<div class="texture-overlay"></div>
<div class="holographic-grid"></div>
<div class="holo-overlay"></div>
<div class="glare"></div>
<div class="glitter-layer"></div>
`;

class TcgCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    static get observedAttributes() {
        return ["theme", "data-pos"];
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
        const CONFIG = window.CONFIG;

        // Set theme
        this.setAttribute("theme", data.theme);
        this.setAttribute("data-id", data.id);

        // Header
        this.shadowRoot.querySelector(".stage-label").textContent =
            data.header.stage;
        this.shadowRoot.querySelector(".card-name").textContent =
            data.header.name;
        this.shadowRoot.querySelector(".hp-label").textContent =
            data.header.hpLabel;

        // HP Value logic
        const hpValueContainer = this.shadowRoot.querySelector(".hp-value");
        if (data.header.hpType === "dynamic-exp") {
            const exp = window.TCG.Utils.calculateYearsSince(
                CONFIG.CAREER_START_DATE
            );
            hpValueContainer.innerHTML = `<span id="dynamic-exp">${exp}</span>Y`;
        } else if (data.header.hpType === "dynamic-age") {
            const age = window.TCG.Utils.calculateYearsSince(CONFIG.BIRTH_DATE);
            hpValueContainer.innerHTML = `<span id="dynamic-age">${age}</span>`;
        } else {
            hpValueContainer.textContent = data.header.hpValue || "";
        }

        // Image
        const img = this.shadowRoot.querySelector(".card-image");
        img.src = data.image;
        img.alt = data.header.name;
        img.dataset.card = data.id;

        // Row 1
        const row1 = this.shadowRoot.querySelector(".row-1");
        row1.querySelector("h3").textContent = data.body.row1.title;
        row1.querySelector("p").textContent = data.body.row1.desc;
        row1.querySelector(".damage i").className = data.body.row1.icon;

        // Row 2
        const row2 = this.shadowRoot.querySelector(".row-2");
        row2.querySelector("h3").textContent = data.body.row2.title;
        row2.querySelector("p").textContent = data.body.row2.desc;

        // Actions
        const actionsContainer =
            this.shadowRoot.querySelector(".action-btn-group");
        actionsContainer.innerHTML = "";
        if (data.body.row2.actions) {
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

        // Footer
        this.shadowRoot.querySelector(".weakness").textContent =
            data.footer.text;
    }
}

window.TCG.TcgCard = TcgCard;
customElements.define("tcg-card", TcgCard);
